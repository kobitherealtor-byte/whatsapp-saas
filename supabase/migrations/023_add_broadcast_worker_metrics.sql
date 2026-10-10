alter table public.automation_runs
  add column if not exists broadcast_claimed integer not null default 0,
  add column if not exists broadcast_sent integer not null default 0,
  add column if not exists broadcast_failed integer not null default 0;