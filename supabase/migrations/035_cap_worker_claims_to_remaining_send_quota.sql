create or replace function public.account_remaining_send_slots(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_limits public.account_limits%rowtype;
  v_sent integer;
begin
  insert into public.account_limits(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform public.refresh_account_period(p_user_id);

  select *
  into v_limits
  from public.account_limits
  where user_id=p_user_id;

  if v_limits.billing_status not in ('beta','trialing','active') then
    return 0;
  end if;

  select count(*)
  into v_sent
  from public.send_logs sl
  where sl.user_id=p_user_id
    and sl.status='sent'
    and sl.created_at >= v_limits.current_period_start
    and sl.created_at < v_limits.current_period_end;

  return greatest(0, v_limits.monthly_send_limit - v_sent);
end;
$$;

revoke execute on function public.account_remaining_send_slots(uuid)
  from public, anon, authenticated;
grant execute on function public.account_remaining_send_slots(uuid)
  to service_role;

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
set search_path=public
as $$
begin
  return query
  with ranked as (
    select
      sm.id,
      sm.user_id,
      row_number() over (
        partition by sm.user_id
        order by sm.scheduled_time asc, sm.created_at asc
      ) as rn,
      public.account_remaining_send_slots(sm.user_id) as remaining
    from public.scheduled_messages sm
    join public.whatsapp_connections wc on wc.user_id=sm.user_id
    where sm.status::text='pending'
      and sm.scheduled_time <= now()
      and wc.status::text='connected'
      and public.account_feature_enabled(sm.user_id,'scheduler')
  ),
  due as (
    select sm.id
    from public.scheduled_messages sm
    join ranked r on r.id=sm.id
    where r.rn <= r.remaining
      and r.remaining > 0
    order by sm.scheduled_time asc
    for update of sm skip locked
    limit greatest(1, least(coalesce(p_limit,25),100))
  ),
  claimed as (
    update public.scheduled_messages sm
    set status='processing',
        claim_token=gen_random_uuid(),
        claimed_at=now(),
        updated_at=now()
    from due
    where sm.id=due.id
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

revoke execute on function public.claim_due_scheduled_messages(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_scheduled_messages(integer)
  to service_role;

create or replace function public.claim_pending_campaign_dispatches(p_limit integer default 50)
returns table (
  id uuid,
  campaign_id uuid,
  user_id uuid,
  group_id uuid,
  scheduled_for timestamptz,
  message_body text,
  media_url text,
  destination_chat_id text,
  claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with ranked as (
    select
      cd.id,
      cd.user_id,
      row_number() over (
        partition by cd.user_id
        order by coalesce(cd.available_at,cd.created_at) asc
      ) as rn,
      public.account_remaining_send_slots(cd.user_id) as remaining
    from public.campaign_dispatches cd
    join public.whatsapp_connections wc on wc.user_id=cd.user_id
    where cd.status='pending'
      and coalesce(cd.available_at,cd.created_at) <= now()
      and wc.status::text='connected'
      and public.account_feature_enabled(cd.user_id,'group_publisher')
  ),
  due as (
    select cd.id
    from public.campaign_dispatches cd
    join ranked r on r.id=cd.id
    where r.rn <= r.remaining
      and r.remaining > 0
    order by coalesce(cd.available_at,cd.created_at) asc
    for update of cd skip locked
    limit greatest(1, least(coalesce(p_limit,50),100))
  ),
  claimed as (
    update public.campaign_dispatches cd
    set status='processing',
        claim_token=gen_random_uuid(),
        claimed_at=now(),
        updated_at=now()
    from due
    where cd.id=due.id
    returning cd.*
  )
  select
    c.id,c.campaign_id,c.user_id,c.group_id,c.scheduled_for,
    c.message_body,c.media_url,c.destination_chat_id,c.claim_token
  from claimed c
  order by coalesce(c.available_at,c.created_at) asc;
end;
$$;

revoke execute on function public.claim_pending_campaign_dispatches(integer)
  from public, anon, authenticated;
grant execute on function public.claim_pending_campaign_dispatches(integer)
  to service_role;

drop function if exists public.claim_due_broadcast_recipients(integer);

create function public.claim_due_broadcast_recipients(p_limit integer default 5)
returns table (
  id uuid,
  campaign_id uuid,
  user_id uuid,
  recipient_name text,
  recipient_number text,
  message_body text,
  media_url text,
  send_interval_seconds integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_campaign_id uuid;
  v_user_id uuid;
  v_remaining integer;
begin
  select br.campaign_id, br.user_id
  into v_campaign_id, v_user_id
  from public.broadcast_recipients br
  join public.broadcast_campaigns bc on bc.id=br.campaign_id
  join public.whatsapp_connections wc on wc.user_id=br.user_id
  where br.status='pending'
    and br.available_at <= now()
    and bc.status='active'
    and bc.scheduled_for <= now()
    and wc.status::text='connected'
    and public.account_feature_enabled(br.user_id,'broadcasts')
    and public.account_remaining_send_slots(br.user_id) > 0
  order by br.available_at asc
  limit 1;

  if v_campaign_id is null then
    return;
  end if;

  v_remaining := public.account_remaining_send_slots(v_user_id);
  if v_remaining <= 0 then
    return;
  end if;

  return query
  with due as (
    select br.id
    from public.broadcast_recipients br
    where br.campaign_id=v_campaign_id
      and br.status='pending'
      and br.available_at <= now() + interval '20 seconds'
    order by br.available_at asc
    for update of br skip locked
    limit greatest(
      1,
      least(coalesce(p_limit,5),5,v_remaining)
    )
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
    c.recipient_name,
    c.recipient_number,
    bc.message_body,
    bc.media_url,
    bc.send_interval_seconds,
    c.claim_token
  from claimed c
  join public.broadcast_campaigns bc on bc.id=c.campaign_id
  order by c.available_at asc;
end;
$$;

revoke execute on function public.claim_due_broadcast_recipients(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_broadcast_recipients(integer)
  to service_role;