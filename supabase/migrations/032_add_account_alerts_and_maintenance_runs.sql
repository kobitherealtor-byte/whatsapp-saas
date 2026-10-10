create table if not exists public.account_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null,
  severity text not null default 'info'
    check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  href text,
  is_read boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, alert_key)
);

alter table public.account_alerts enable row level security;

create policy account_alerts_select_own
  on public.account_alerts for select
  using (auth.uid() = user_id);

create policy account_alerts_update_own
  on public.account_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.account_alerts to authenticated;
grant all on public.account_alerts to service_role;

create index if not exists account_alerts_user_unread_idx
  on public.account_alerts(user_id, is_read, resolved_at, created_at desc);

create table if not exists public.system_maintenance_runs (
  task_key text primary key,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.system_maintenance_runs enable row level security;
revoke all on public.system_maintenance_runs from public, anon, authenticated;
grant all on public.system_maintenance_runs to service_role;