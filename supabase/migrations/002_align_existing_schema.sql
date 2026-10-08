-- Compatibility migration for the existing Supabase project.
-- Adds the column contract used by the Next.js app without dropping legacy columns.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.whatsapp_connections
  add column if not exists provider text not null default 'green_api',
  add column if not exists connected_at timestamptz,
  add column if not exists last_error text;

alter table public.whatsapp_groups
  add column if not exists chat_id text,
  add column if not exists name text,
  add column if not exists participant_count integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists synced_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

update public.whatsapp_groups
set chat_id = coalesce(chat_id, group_chat_id::text),
    name = coalesce(name, group_name::text),
    participant_count = coalesce(participant_count, member_count)
where chat_id is null or name is null or participant_count is null;

create unique index if not exists whatsapp_groups_user_chat_id_uidx
  on public.whatsapp_groups(user_id, chat_id)
  where chat_id is not null;

alter table public.scheduled_messages
  add column if not exists media_url text,
  add column if not exists recurrence_end timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists external_message_id text,
  add column if not exists error_text text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter type public.message_status add value if not exists 'processing';
exception when undefined_object then null;
end $$;

alter table public.group_campaigns
  add column if not exists name text,
  add column if not exists media_url text,
  add column if not exists days_of_week smallint[],
  add column if not exists send_time time,
  add column if not exists timezone text not null default 'Asia/Jerusalem',
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

update public.group_campaigns
set name = coalesce(name, campaign_name::text),
    media_url = coalesce(media_url, file_url),
    days_of_week = coalesce(days_of_week, allowed_days::smallint[]),
    send_time = coalesce(send_time, dispatch_time)
where name is null or media_url is null or days_of_week is null or send_time is null;

do $$ begin
  alter type public.campaign_status add value if not exists 'draft';
  alter type public.campaign_status add value if not exists 'cancelled';
exception when undefined_object then null;
end $$;

alter table public.campaign_groups
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists campaign_groups_campaign_group_uidx
  on public.campaign_groups(campaign_id, group_id);

alter table public.send_logs
  add column if not exists kind text,
  add column if not exists ref_id uuid,
  add column if not exists destination text,
  add column if not exists detail text,
  add column if not exists external_message_id text,
  add column if not exists created_at timestamptz not null default now();

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
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;
