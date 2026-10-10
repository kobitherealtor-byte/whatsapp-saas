-- Free plan: up to 3 unique WhatsApp chats per billing period.
-- Existing beta accounts remain unchanged. New users are provisioned onto free.

alter table public.plan_catalog
  add column if not exists max_monthly_chats integer
  check (max_monthly_chats is null or max_monthly_chats > 0);

alter table public.account_limits
  add column if not exists max_monthly_chats integer
  check (max_monthly_chats is null or max_monthly_chats > 0);

insert into public.plan_catalog(
  plan_code,
  display_name,
  max_pending_messages,
  max_active_campaigns,
  max_groups_per_campaign,
  max_broadcast_recipients,
  monthly_send_limit,
  max_monthly_chats,
  is_active
)
values ('free','Free',50,10,3,1,10000,3,true)
on conflict (plan_code)
do update set
  display_name=excluded.display_name,
  max_pending_messages=excluded.max_pending_messages,
  max_active_campaigns=excluded.max_active_campaigns,
  max_groups_per_campaign=excluded.max_groups_per_campaign,
  max_broadcast_recipients=excluded.max_broadcast_recipients,
  monthly_send_limit=excluded.monthly_send_limit,
  max_monthly_chats=excluded.max_monthly_chats,
  is_active=true,
  updated_at=now();

update public.plan_catalog
set max_monthly_chats=null, updated_at=now()
where plan_code='beta';

insert into public.plan_features(plan_code, feature_key, enabled)
values
  ('free','scheduler',true),
  ('free','group_publisher',true),
  ('free','broadcasts',false),
  ('free','inbox',false),
  ('free','embedded_inbox',false),
  ('free','holiday_guard',true),
  ('free','media_upload',true)
on conflict (plan_code, feature_key)
do update set enabled=excluded.enabled, updated_at=now();

alter table public.account_limits
  alter column plan_code set default 'free',
  alter column billing_status set default 'active';

create or replace function public.apply_plan_to_account(
  p_user_id uuid,
  p_plan_code text,
  p_billing_status text default 'active'
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_plan public.plan_catalog%rowtype;
begin
  select *
  into v_plan
  from public.plan_catalog
  where plan_code=p_plan_code
    and is_active=true;

  if not found then
    raise exception 'unknown_plan';
  end if;

  if p_billing_status not in ('beta','trialing','active','past_due','cancelled') then
    raise exception 'invalid_billing_status';
  end if;

  insert into public.account_limits(
    user_id,
    plan_code,
    billing_status,
    max_pending_messages,
    max_active_campaigns,
    max_groups_per_campaign,
    max_broadcast_recipients,
    monthly_send_limit,
    max_monthly_chats
  )
  values (
    p_user_id,
    v_plan.plan_code,
    p_billing_status,
    v_plan.max_pending_messages,
    v_plan.max_active_campaigns,
    v_plan.max_groups_per_campaign,
    v_plan.max_broadcast_recipients,
    v_plan.monthly_send_limit,
    v_plan.max_monthly_chats
  )
  on conflict (user_id)
  do update set
    plan_code=excluded.plan_code,
    billing_status=excluded.billing_status,
    max_pending_messages=excluded.max_pending_messages,
    max_active_campaigns=excluded.max_active_campaigns,
    max_groups_per_campaign=excluded.max_groups_per_campaign,
    max_broadcast_recipients=excluded.max_broadcast_recipients,
    monthly_send_limit=excluded.monthly_send_limit,
    max_monthly_chats=excluded.max_monthly_chats,
    updated_at=now();

  return true;
end;
$$;

revoke execute on function public.apply_plan_to_account(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.apply_plan_to_account(uuid,text,text)
  to service_role;

create or replace function public.account_chat_usage(p_user_id uuid)
returns integer
language sql
security definer
set search_path=public
as $$
  select count(distinct nullif(trim(sl.destination), ''))::integer
  from public.send_logs sl
  join public.account_limits al on al.user_id=sl.user_id
  where sl.user_id=p_user_id
    and sl.status='sent'
    and sl.created_at >= al.current_period_start
    and sl.created_at < al.current_period_end;
$$;

revoke execute on function public.account_chat_usage(uuid)
  from public, anon, authenticated;
grant execute on function public.account_chat_usage(uuid)
  to service_role;

create or replace function public.account_can_use_chat(
  p_user_id uuid,
  p_destination text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_limits public.account_limits%rowtype;
  v_destination text;
  v_used integer;
  v_already_used boolean;
begin
  v_destination := nullif(trim(coalesce(p_destination,'')), '');
  if v_destination is null then
    return false;
  end if;

  select *
  into v_limits
  from public.account_limits
  where user_id=p_user_id;

  if not found then
    perform public.apply_plan_to_account(p_user_id, 'free', 'active');
    select * into v_limits
    from public.account_limits
    where user_id=p_user_id;
  end if;

  if v_limits.max_monthly_chats is null then
    return true;
  end if;

  select exists(
    select 1
    from public.send_logs sl
    where sl.user_id=p_user_id
      and sl.status='sent'
      and sl.destination=v_destination
      and sl.created_at >= v_limits.current_period_start
      and sl.created_at < v_limits.current_period_end
  )
  into v_already_used;

  if v_already_used then
    return true;
  end if;

  select public.account_chat_usage(p_user_id) into v_used;
  return v_used < v_limits.max_monthly_chats;
end;
$$;

revoke execute on function public.account_can_use_chat(uuid,text)
  from public, anon, authenticated;
grant execute on function public.account_can_use_chat(uuid,text)
  to service_role;

-- Personal scheduler: do not claim a fourth unique chat on Free.
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
      and public.account_can_send(sm.user_id)
      and public.account_can_use_chat(sm.user_id, sm.recipient_number)
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

-- Group Publisher dispatches: each WhatsApp group is a chat for Free-plan quota.
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
      and public.account_can_send(cd.user_id)
      and public.account_can_use_chat(cd.user_id, cd.destination_chat_id)
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

-- Provision all future signups directly onto Free.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  perform public.apply_plan_to_account(new.id, 'free', 'active');

  return new;
end;
$$;
