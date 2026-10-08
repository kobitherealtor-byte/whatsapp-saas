create table if not exists public.green_api_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id_instance text not null,
  api_token_instance text not null,
  api_url text not null,
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.green_api_credentials enable row level security;

revoke all on table public.green_api_credentials from anon, authenticated;
grant all on table public.green_api_credentials to service_role;

drop trigger if exists green_api_credentials_set_updated_at on public.green_api_credentials;
create trigger green_api_credentials_set_updated_at
before update on public.green_api_credentials
for each row execute function public.set_updated_at();
