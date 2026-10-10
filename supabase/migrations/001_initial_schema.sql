-- WhatsApp Plus MVP schema
-- Safe to run on a fresh Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'green_api',
  instance_id text,
  phone_number text,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'creating', 'waiting_for_qr', 'connected', 'error')),
  connected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_connections is
  'Contains connection metadata only. Provider API tokens must never be stored in this user-readable table.';

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_number text not null,
  recipient_name text,
  message_body text not null,
  media_url text,
  scheduled_time timestamptz not null,
  timezone text not null default 'Asia/Jerusalem',
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  recurrence_end timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  external_message_id text,
  error_text text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_messages_user_time_idx
  on public.scheduled_messages(user_id, scheduled_time);

create index if not exists scheduled_messages_pending_idx
  on public.scheduled_messages(status, scheduled_time)
  where status = 'pending';

create table if not exists public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text not null,
  name text not null,
  participant_count integer,
  is_active boolean not null default true,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, chat_id)
);

create table if not exists public.group_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  message_body text not null,
  media_url text,
  days_of_week smallint[] not null default '{}',
  send_time time not null,
  timezone text not null default 'Asia/Jerusalem',
  start_date date not null default current_date,
  end_date date,
  skip_holidays boolean not null default true,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.campaign_groups (
  campaign_id uuid not null references public.group_campaigns(id) on delete cascade,
  group_id uuid not null references public.whatsapp_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, group_id)
);

create table if not exists public.send_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('scheduled_message', 'group_campaign')),
  ref_id uuid not null,
  destination text,
  status text not null check (status in ('processing', 'sent', 'failed', 'skipped')),
  detail text,
  external_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists send_logs_user_created_idx
  on public.send_logs(user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_connections_set_updated_at on public.whatsapp_connections;
create trigger whatsapp_connections_set_updated_at before update on public.whatsapp_connections
for each row execute function public.set_updated_at();

drop trigger if exists scheduled_messages_set_updated_at on public.scheduled_messages;
create trigger scheduled_messages_set_updated_at before update on public.scheduled_messages
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_groups_set_updated_at on public.whatsapp_groups;
create trigger whatsapp_groups_set_updated_at before update on public.whatsapp_groups
for each row execute function public.set_updated_at();

drop trigger if exists group_campaigns_set_updated_at on public.group_campaigns;
create trigger group_campaigns_set_updated_at before update on public.group_campaigns
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.whatsapp_connections enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.whatsapp_groups enable row level security;
alter table public.group_campaigns enable row level security;
alter table public.campaign_groups enable row level security;
alter table public.send_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "connections_own_rows" on public.whatsapp_connections;
create policy "connections_own_rows" on public.whatsapp_connections
for all using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "scheduled_messages_own_rows" on public.scheduled_messages;
create policy "scheduled_messages_own_rows" on public.scheduled_messages
for all using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "whatsapp_groups_own_rows" on public.whatsapp_groups;
create policy "whatsapp_groups_own_rows" on public.whatsapp_groups
for all using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "group_campaigns_own_rows" on public.group_campaigns;
create policy "group_campaigns_own_rows" on public.group_campaigns
for all using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "campaign_groups_select_own" on public.campaign_groups;
create policy "campaign_groups_select_own" on public.campaign_groups
for select using (
  exists (
    select 1
    from public.group_campaigns c
    where c.id = campaign_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "campaign_groups_insert_own" on public.campaign_groups;
create policy "campaign_groups_insert_own" on public.campaign_groups
for insert with check (
  exists (
    select 1
    from public.group_campaigns c
    join public.whatsapp_groups g on g.id = group_id
    where c.id = campaign_id
      and c.user_id = (select auth.uid())
      and g.user_id = (select auth.uid())
  )
);

drop policy if exists "campaign_groups_delete_own" on public.campaign_groups;
create policy "campaign_groups_delete_own" on public.campaign_groups
for delete using (
  exists (
    select 1
    from public.group_campaigns c
    where c.id = campaign_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "send_logs_select_own" on public.send_logs;
create policy "send_logs_select_own" on public.send_logs
for select using ((select auth.uid()) = user_id);

-- Logs are intentionally append-only from the client side.
drop policy if exists "send_logs_insert_own" on public.send_logs;
create policy "send_logs_insert_own" on public.send_logs
for insert with check ((select auth.uid()) = user_id);
