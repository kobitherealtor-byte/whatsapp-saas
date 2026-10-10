create table if not exists public.plan_catalog (
  plan_code text primary key,
  display_name text not null,
  max_pending_messages integer not null default 500 check (max_pending_messages > 0),
  max_active_campaigns integer not null default 50 check (max_active_campaigns > 0),
  max_groups_per_campaign integer not null default 100 check (max_groups_per_campaign > 0),
  max_broadcast_recipients integer not null default 2000 check (max_broadcast_recipients > 0),
  monthly_send_limit integer not null default 10000 check (monthly_send_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_catalog enable row level security;
revoke all on public.plan_catalog from public, anon, authenticated;
grant all on public.plan_catalog to service_role;

insert into public.plan_catalog(
  plan_code,
  display_name,
  max_pending_messages,
  max_active_campaigns,
  max_groups_per_campaign,
  max_broadcast_recipients,
  monthly_send_limit,
  is_active
)
values ('beta','Beta',500,50,100,2000,10000,true)
on conflict (plan_code) do nothing;

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
    monthly_send_limit
  )
  values (
    p_user_id,
    v_plan.plan_code,
    p_billing_status,
    v_plan.max_pending_messages,
    v_plan.max_active_campaigns,
    v_plan.max_groups_per_campaign,
    v_plan.max_broadcast_recipients,
    v_plan.monthly_send_limit
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
    updated_at=now();

  return true;
end;
$$;

revoke execute on function public.apply_plan_to_account(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.apply_plan_to_account(uuid,text,text)
  to service_role;