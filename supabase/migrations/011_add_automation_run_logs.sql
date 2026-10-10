create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running','success','failed')),
  personal_claimed integer not null default 0,
  personal_sent integer not null default 0,
  personal_failed integer not null default 0,
  group_claimed integer not null default 0,
  group_sent integer not null default 0,
  group_failed integer not null default 0,
  duration_ms integer,
  error_text text,
  created_at timestamptz not null default now()
);

create index if not exists automation_runs_started_idx
  on public.automation_runs(started_at desc);

alter table public.automation_runs enable row level security;
revoke all on table public.automation_runs from anon, authenticated;
grant all on table public.automation_runs to service_role;