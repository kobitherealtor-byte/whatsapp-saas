alter table public.group_campaigns
  add column if not exists prepare_fail_count integer not null default 0
  check (prepare_fail_count >= 0);