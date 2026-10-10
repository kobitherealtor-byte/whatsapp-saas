create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from public, anon, authenticated;
grant all on public.admin_users to service_role;

insert into public.admin_users(user_id)
select id
from auth.users
order by created_at asc
limit 1
on conflict (user_id) do nothing;