create table if not exists public.holiday_dates (
  holiday_date date primary key,
  name text not null,
  country_code text not null default 'IL',
  created_at timestamptz not null default now()
);

alter table public.holiday_dates enable row level security;
revoke all on table public.holiday_dates from anon;
grant select on table public.holiday_dates to authenticated;
grant all on table public.holiday_dates to service_role;

alter table public.group_campaigns
  add column if not exists dispatch_claim_token uuid,
  add column if not exists dispatch_claimed_at timestamptz;

create table if not exists public.campaign_dispatches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.group_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.whatsapp_groups(id) on delete cascade,
  scheduled_for timestamptz not null,
  message_body text not null,
  media_url text,
  destination_chat_id text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','skipped')),
  retry_count integer not null default 0 check (retry_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  external_message_id text,
  error_text text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, group_id, scheduled_for)
);

create index if not exists campaign_dispatches_due_idx
  on public.campaign_dispatches(created_at)
  where status='pending';

alter table public.campaign_dispatches enable row level security;
revoke all on table public.campaign_dispatches from anon, authenticated;
grant all on table public.campaign_dispatches to service_role;

drop trigger if exists campaign_dispatches_set_updated_at on public.campaign_dispatches;
create trigger campaign_dispatches_set_updated_at
before update on public.campaign_dispatches
for each row execute function public.set_updated_at();

create or replace function public.claim_due_campaigns(p_limit integer default 10)
returns table (
  id uuid,
  user_id uuid,
  name text,
  message_body text,
  media_url text,
  days_of_week smallint[],
  send_time time,
  timezone text,
  start_date date,
  end_date date,
  skip_holidays boolean,
  next_run_at timestamptz,
  dispatch_claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with due as (
    select gc.id
    from public.group_campaigns gc
    where gc.status::text='active'
      and gc.next_run_at is not null
      and gc.next_run_at <= now()
      and (gc.end_date is null or gc.end_date >= (now() at time zone coalesce(gc.timezone,'Asia/Jerusalem'))::date)
    order by gc.next_run_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10), 50))
  ),
  claimed as (
    update public.group_campaigns gc
    set dispatch_claim_token=gen_random_uuid(),
        dispatch_claimed_at=now(),
        updated_at=now()
    from due
    where gc.id=due.id
    returning gc.*
  )
  select
    c.id,c.user_id,c.name,c.message_body,c.media_url,c.days_of_week,
    c.send_time,c.timezone,c.start_date,c.end_date,c.skip_holidays,
    c.next_run_at,c.dispatch_claim_token
  from claimed c
  order by c.next_run_at asc;
end;
$$;

create or replace function public.release_campaign_claim(
  p_campaign_id uuid,
  p_claim_token uuid,
  p_next_run_at timestamptz,
  p_last_run_at timestamptz default now(),
  p_status text default 'active',
  p_last_error text default null
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_updated integer;
begin
  update public.group_campaigns
  set next_run_at=p_next_run_at,last_run_at=p_last_run_at,
      status=p_status::public.campaign_status,last_error=p_last_error,
      dispatch_claim_token=null,dispatch_claimed_at=null,updated_at=now()
  where id=p_campaign_id and dispatch_claim_token=p_claim_token;
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;

create or replace function public.recover_stale_campaign_claims()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  update public.group_campaigns
  set dispatch_claim_token=null,dispatch_claimed_at=null,updated_at=now()
  where dispatch_claim_token is not null
    and dispatch_claimed_at < now() - interval '10 minutes';
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.claim_pending_campaign_dispatches(p_limit integer default 50)
returns table (
  id uuid,campaign_id uuid,user_id uuid,group_id uuid,
  scheduled_for timestamptz,message_body text,media_url text,
  destination_chat_id text,claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with due as (
    select cd.id
    from public.campaign_dispatches cd
    where cd.status='pending'
    order by cd.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,50),100))
  ),
  claimed as (
    update public.campaign_dispatches cd
    set status='processing',claim_token=gen_random_uuid(),
        claimed_at=now(),updated_at=now()
    from due where cd.id=due.id
    returning cd.*
  )
  select c.id,c.campaign_id,c.user_id,c.group_id,c.scheduled_for,
         c.message_body,c.media_url,c.destination_chat_id,c.claim_token
  from claimed c order by c.created_at asc;
end;
$$;

create or replace function public.finalize_campaign_dispatch(
  p_id uuid,p_claim_token uuid,p_success boolean,
  p_external_message_id text default null,p_error_text text default null
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare v_dispatch public.campaign_dispatches%rowtype;
begin
  select * into v_dispatch from public.campaign_dispatches
  where id=p_id and claim_token=p_claim_token and status='processing'
  for update;
  if not found then return 'stale_claim'; end if;

  if p_success then
    update public.campaign_dispatches
    set status='sent',sent_at=now(),external_message_id=p_external_message_id,
        error_text=null,claim_token=null,claimed_at=null,updated_at=now()
    where id=p_id;

    insert into public.send_logs(
      user_id,entity_type,entity_id,recipient_id,status,error_message,sent_at,
      kind,ref_id,destination,detail,external_message_id,created_at
    ) values (
      v_dispatch.user_id,'group_campaign',v_dispatch.campaign_id,
      v_dispatch.destination_chat_id,'sent',null,now(),
      'group_campaign',v_dispatch.campaign_id,v_dispatch.destination_chat_id,
      null,p_external_message_id,now()
    );
    return 'sent';
  end if;

  if coalesce(v_dispatch.retry_count,0)<2 then
    update public.campaign_dispatches
    set status='pending',retry_count=retry_count+1,error_text=p_error_text,
        claim_token=null,claimed_at=null,updated_at=now()
    where id=p_id;
    return 'retry_scheduled';
  end if;

  update public.campaign_dispatches
  set status='failed',retry_count=retry_count+1,error_text=p_error_text,
      claim_token=null,claimed_at=null,updated_at=now()
  where id=p_id;

  insert into public.send_logs(
    user_id,entity_type,entity_id,recipient_id,status,error_message,sent_at,
    kind,ref_id,destination,detail,external_message_id,created_at
  ) values (
    v_dispatch.user_id,'group_campaign',v_dispatch.campaign_id,
    v_dispatch.destination_chat_id,'failed',p_error_text,null,
    'group_campaign',v_dispatch.campaign_id,v_dispatch.destination_chat_id,
    p_error_text,null,now()
  );
  return 'failed';
end;
$$;

create or replace function public.recover_stale_campaign_dispatches()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer;
begin
  update public.campaign_dispatches
  set status='pending',claim_token=null,claimed_at=null,updated_at=now()
  where status='processing'
    and claimed_at < now() - interval '10 minutes';
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke execute on function public.claim_due_campaigns(integer) from public,anon,authenticated;
revoke execute on function public.release_campaign_claim(uuid,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
revoke execute on function public.recover_stale_campaign_claims() from public,anon,authenticated;
revoke execute on function public.claim_pending_campaign_dispatches(integer) from public,anon,authenticated;
revoke execute on function public.finalize_campaign_dispatch(uuid,uuid,boolean,text,text) from public,anon,authenticated;
revoke execute on function public.recover_stale_campaign_dispatches() from public,anon,authenticated;

grant execute on function public.claim_due_campaigns(integer) to service_role;
grant execute on function public.release_campaign_claim(uuid,uuid,timestamptz,timestamptz,text,text) to service_role;
grant execute on function public.recover_stale_campaign_claims() to service_role;
grant execute on function public.claim_pending_campaign_dispatches(integer) to service_role;
grant execute on function public.finalize_campaign_dispatch(uuid,uuid,boolean,text,text) to service_role;
grant execute on function public.recover_stale_campaign_dispatches() to service_role;
