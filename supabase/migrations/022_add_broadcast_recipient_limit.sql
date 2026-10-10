alter table public.account_limits
  add column if not exists max_broadcast_recipients integer not null default 2000
  check (max_broadcast_recipients > 0);