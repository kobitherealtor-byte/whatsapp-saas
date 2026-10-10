create or replace function public.claim_due_scheduled_messages(p_limit integer default 25)
returns table (
  id uuid,
  user_id uuid,
  recipient_number text,
  recipient_name text,
  message_body text,
  media_url text,
  scheduled_time timestamptz,
  timezone text,
  recurrence text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select sm.id
    from public.scheduled_messages sm
    join public.whatsapp_connections wc on wc.user_id = sm.user_id
    where sm.status::text = 'pending'
      and sm.scheduled_time <= now()
      and wc.status::text = 'connected'
    order by sm.scheduled_time asc
    for update of sm skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ),
  claimed as (
    update public.scheduled_messages sm
    set status = 'processing',
        claim_token = gen_random_uuid(),
        claimed_at = now(),
        updated_at = now()
    from due
    where sm.id = due.id
    returning sm.*
  )
  select
    c.id,
    c.user_id,
    c.recipient_number::text,
    c.recipient_name::text,
    c.message_body,
    c.media_url,
    c.scheduled_time,
    c.timezone::text,
    c.recurrence::text,
    c.claim_token
  from claimed c
  order by c.scheduled_time asc;
end;
$$;

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
    join public.whatsapp_connections wc on wc.user_id = gc.user_id
    where gc.status::text='active'
      and gc.next_run_at is not null
      and gc.next_run_at <= now()
      and wc.status::text = 'connected'
      and (gc.end_date is null or gc.end_date >= (now() at time zone coalesce(gc.timezone,'Asia/Jerusalem'))::date)
    order by gc.next_run_at asc
    for update of gc skip locked
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
    join public.whatsapp_connections wc on wc.user_id = cd.user_id
    where cd.status='pending'
      and coalesce(cd.available_at, cd.created_at) <= now()
      and wc.status::text = 'connected'
    order by coalesce(cd.available_at, cd.created_at) asc
    for update of cd skip locked
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
  from claimed c order by coalesce(c.available_at, c.created_at) asc;
end;
$$;

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

    union all

    select min(gc.next_run_at) as next_at
    from public.group_campaigns gc
    join public.whatsapp_connections wc on wc.user_id = gc.user_id
    where gc.status::text = 'active'
      and gc.next_run_at is not null
      and wc.status::text = 'connected'

    union all

    select min(coalesce(cd.available_at, cd.created_at)) as next_at
    from public.campaign_dispatches cd
    join public.whatsapp_connections wc on wc.user_id = cd.user_id
    where cd.status = 'pending'
      and wc.status::text = 'connected'
  ) candidates;
$$;

revoke execute on function public.get_next_automation_run_at() from public, anon, authenticated;
grant execute on function public.get_next_automation_run_at() to service_role;