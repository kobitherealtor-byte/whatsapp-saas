create table if not exists public.account_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'beta',
  billing_status text not null default 'beta'
    check (billing_status in ('beta','trialing','active','past_due','cancelled')),
  max_pending_messages integer not null default 500 check (max_pending_messages > 0),
  max_active_campaigns integer not null default 50 check (max_active_campaigns > 0),
  max_groups_per_campaign integer not null default 100 check (max_groups_per_campaign > 0),
  monthly_send_limit integer not null default 10000 check (monthly_send_limit > 0),
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_limits enable row level security;

drop policy if exists "account_limits_select_own" on public.account_limits;
create policy "account_limits_select_own"
on public.account_limits
for select
to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete on table public.account_limits from anon, authenticated;
grant select on table public.account_limits to authenticated;
grant all on table public.account_limits to service_role;

insert into public.account_limits(user_id)
select id from auth.users
on conflict (user_id) do nothing;