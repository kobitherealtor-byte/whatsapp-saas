create table if not exists public.broadcast_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  message_body text not null,
  media_url text,
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Jerusalem',
  status text not null default 'active'
    check (status in ('draft','active','paused','completed','cancelled')),
  send_interval_seconds integer not null default 3
    check (send_interval_seconds between 1 and 3600),
  total_recipients integer not null default 0 check (total_recipients >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists broadcast_campaigns_user_created_idx
  on public.broadcast_campaigns(user_id, created_at desc);

create index if not exists broadcast_campaigns_due_idx
  on public.broadcast_campaigns(status, scheduled_for);

create table if not exists public.broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.broadcast_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text,
  recipient_number text not null,
  normalized_number text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','skipped','cancelled')),
  available_at timestamptz not null,
  retry_count integer not null default 0 check (retry_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  sent_at timestamptz,
  external_message_id text,
  error_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, normalized_number)
);

create index if not exists broadcast_recipients_due_idx
  on public.broadcast_recipients(status, available_at);

create index if not exists broadcast_recipients_campaign_status_idx
  on public.broadcast_recipients(campaign_id, status);

alter table public.broadcast_campaigns enable row level security;
alter table public.broadcast_recipients enable row level security;

drop policy if exists "broadcast_campaigns_select_own" on public.broadcast_campaigns;
create policy "broadcast_campaigns_select_own"
on public.broadcast_campaigns for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "broadcast_campaigns_insert_own" on public.broadcast_campaigns;
create policy "broadcast_campaigns_insert_own"
on public.broadcast_campaigns for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "broadcast_campaigns_update_own" on public.broadcast_campaigns;
create policy "broadcast_campaigns_update_own"
on public.broadcast_campaigns for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "broadcast_recipients_select_own" on public.broadcast_recipients;
create policy "broadcast_recipients_select_own"
on public.broadcast_recipients for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "broadcast_recipients_insert_own" on public.broadcast_recipients;
create policy "broadcast_recipients_insert_own"
on public.broadcast_recipients for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "broadcast_recipients_update_own" on public.broadcast_recipients;
create policy "broadcast_recipients_update_own"
on public.broadcast_recipients for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.broadcast_campaigns to authenticated;
grant select, insert, update on public.broadcast_recipients to authenticated;
grant all on public.broadcast_campaigns to service_role;
grant all on public.broadcast_recipients to service_role;

create or replace function public.claim_due_broadcast_recipients(p_limit integer default 10)
returns table (
  id uuid,
  campaign_id uuid,
  user_id uuid,
  recipient_number text,
  message_body text,
  media_url text,
  claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with due as (
    select br.id
    from public.broadcast_recipients br
    join public.broadcast_campaigns bc on bc.id = br.campaign_id
    join public.whatsapp_connections wc on wc.user_id = br.user_id
    where br.status = 'pending'
      and br.available_at <= now()
      and bc.status = 'active'
      and bc.scheduled_for <= now()
      and wc.status::text = 'connected'
      and public.account_can_send(br.user_id)
    order by br.available_at asc
    for update of br skip locked
    limit greatest(1, least(coalesce(p_limit,10),50))
  ),
  claimed as (
    update public.broadcast_recipients br
    set status='processing',
        claim_token=gen_random_uuid(),
        claimed_at=now(),
        updated_at=now()
    from due
    where br.id=due.id
    returning br.*
  )
  select
    c.id,
    c.campaign_id,
    c.user_id,
    c.recipient_number,
    bc.message_body,
    bc.media_url,
    c.claim_token
  from claimed c
  join public.broadcast_campaigns bc on bc.id = c.campaign_id
  order by c.available_at asc;
end;
$$;

revoke execute on function public.claim_due_broadcast_recipients(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_broadcast_recipients(integer)
  to service_role;

create or replace function public.finalize_broadcast_recipient(
  p_id uuid,
  p_claim_token uuid,
  p_success boolean,
  p_external_message_id text default null,
  p_error_text text default null
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_recipient public.broadcast_recipients%rowtype;
  v_campaign public.broadcast_campaigns%rowtype;
  v_remaining integer;
begin
  select *
  into v_recipient
  from public.broadcast_recipients
  where id=p_id
    and claim_token=p_claim_token
    and status='processing'
  for update;

  if not found then
    return 'stale_claim';
  end if;

  select *
  into v_campaign
  from public.broadcast_campaigns
  where id=v_recipient.campaign_id
  for update;

  if p_success then
    update public.broadcast_recipients
    set status='sent',
        sent_at=now(),
        external_message_id=p_external_message_id,
        error_text=null,
        claim_token=null,
        claimed_at=null,
        updated_at=now()
    where id=p_id;

    update public.broadcast_campaigns
    set sent_count=sent_count+1,
        updated_at=now()
    where id=v_recipient.campaign_id;

    insert into public.send_logs(
      user_id, entity_type, entity_id, recipient_id, status,
      error_message, sent_at, kind, ref_id, destination, detail,
      external_message_id, created_at
    ) values (
      v_recipient.user_id, 'broadcast_campaign', v_recipient.campaign_id,
      v_recipient.recipient_number, 'sent', null, now(),
      'broadcast', v_recipient.campaign_id, v_recipient.recipient_number,
      v_campaign.message_body, p_external_message_id, now()
    );
  else
    if coalesce(v_recipient.retry_count,0) < 2 then
      update public.broadcast_recipients
      set status='pending',
          retry_count=coalesce(retry_count,0)+1,
          available_at=now()+interval '5 minutes',
          error_text=p_error_text,
          claim_token=null,
          claimed_at=null,
          updated_at=now()
      where id=p_id;
      return 'retry_scheduled';
    end if;

    update public.broadcast_recipients
    set status='failed',
        retry_count=coalesce(retry_count,0)+1,
        error_text=p_error_text,
        claim_token=null,
        claimed_at=null,
        updated_at=now()
    where id=p_id;

    update public.broadcast_campaigns
    set failed_count=failed_count+1,
        last_error=p_error_text,
        updated_at=now()
    where id=v_recipient.campaign_id;

    insert into public.send_logs(
      user_id, entity_type, entity_id, recipient_id, status,
      error_message, sent_at, kind, ref_id, destination, detail,
      created_at
    ) values (
      v_recipient.user_id, 'broadcast_campaign', v_recipient.campaign_id,
      v_recipient.recipient_number, 'failed', p_error_text, null,
      'broadcast', v_recipient.campaign_id, v_recipient.recipient_number,
      v_campaign.message_body, now()
    );
  end if;

  select count(*)
  into v_remaining
  from public.broadcast_recipients
  where campaign_id=v_recipient.campaign_id
    and status in ('pending','processing');

  if v_remaining = 0 then
    update public.broadcast_campaigns
    set status='completed',
        updated_at=now()
    where id=v_recipient.campaign_id
      and status='active';
  end if;

  return case when p_success then 'sent' else 'failed' end;
end;
$$;

revoke execute on function public.finalize_broadcast_recipient(uuid,uuid,boolean,text,text)
  from public, anon, authenticated;
grant execute on function public.finalize_broadcast_recipient(uuid,uuid,boolean,text,text)
  to service_role;

create or replace function public.recover_stale_broadcast_claims()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer;
begin
  update public.broadcast_recipients
  set status='pending',
      claim_token=null,
      claimed_at=null,
      available_at=now()+interval '1 minute',
      updated_at=now()
  where status='processing'
    and claimed_at < now()-interval '10 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.recover_stale_broadcast_claims()
  from public, anon, authenticated;
grant execute on function public.recover_stale_broadcast_claims()
  to service_role;

create or replace function public.get_next_automation_run_at()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select min(next_at)
  from (
    select min(sm.scheduled_time) as next_at
    from public.scheduled_messages sm
    join public.whatsapp_connections wc on wc.user_id = sm.user_id
    where sm.status::text = 'pending'
      and wc.status::text = 'connected'
      and public.account_can_send(sm.user_id)

    union all

    select min(gc.next_run_at) as next_at
    from public.group_campaigns gc
    join public.whatsapp_connections wc on wc.user_id = gc.user_id
    where gc.status::text = 'active'
      and gc.next_run_at is not null
      and wc.status::text = 'connected'
      and public.account_can_send(gc.user_id)

    union all

    select min(coalesce(cd.available_at, cd.created_at)) as next_at
    from public.campaign_dispatches cd
    join public.whatsapp_connections wc on wc.user_id = cd.user_id
    where cd.status = 'pending'
      and wc.status::text = 'connected'
      and public.account_can_send(cd.user_id)

    union all

    select min(br.available_at) as next_at
    from public.broadcast_recipients br
    join public.broadcast_campaigns bc on bc.id=br.campaign_id
    join public.whatsapp_connections wc on wc.user_id=br.user_id
    where br.status='pending'
      and bc.status='active'
      and wc.status::text='connected'
      and public.account_can_send(br.user_id)
  ) candidates;
$$;