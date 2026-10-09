create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text,
  external_customer_id text,
  external_subscription_id text,
  external_price_id text,
  status text not null default 'beta'
    check (status in ('beta','trialing','active','past_due','cancelled')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_accounts_provider_customer_idx
  on public.billing_accounts(provider, external_customer_id)
  where provider is not null and external_customer_id is not null;

create unique index if not exists billing_accounts_provider_subscription_idx
  on public.billing_accounts(provider, external_subscription_id)
  where provider is not null and external_subscription_id is not null;

alter table public.billing_accounts enable row level security;

drop policy if exists "billing_accounts_select_own" on public.billing_accounts;
create policy "billing_accounts_select_own"
on public.billing_accounts
for select
to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete on table public.billing_accounts from anon, authenticated;
grant select on table public.billing_accounts to authenticated;
grant all on table public.billing_accounts to service_role;

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text,
  payload jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique(provider, external_event_id)
);

alter table public.billing_webhook_events enable row level security;
revoke all on table public.billing_webhook_events from public, anon, authenticated;
grant all on table public.billing_webhook_events to service_role;

insert into public.billing_accounts(user_id, status)
select id, 'beta' from auth.users
on conflict (user_id) do nothing;