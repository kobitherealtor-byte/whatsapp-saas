create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instance_id text not null,
  id_message text not null,
  type_webhook text not null,
  direction text not null check (direction in ('incoming','outgoing','status')),
  chat_id text,
  chat_name text,
  sender_id text,
  sender_name text,
  message_type text,
  text_body text,
  media_url text,
  status_message text,
  event_timestamp timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id, id_message, type_webhook)
);

alter table public.inbox_messages enable row level security;

drop policy if exists inbox_messages_select_own on public.inbox_messages;
create policy inbox_messages_select_own
  on public.inbox_messages for select
  to authenticated
  using (auth.uid()=user_id);

revoke all on public.inbox_messages from public, anon;
grant select on public.inbox_messages to authenticated;
grant all on public.inbox_messages to service_role;

create index if not exists inbox_messages_user_chat_time_idx
  on public.inbox_messages(user_id, chat_id, event_timestamp desc);

create index if not exists inbox_messages_instance_message_idx
  on public.inbox_messages(instance_id, id_message);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='inbox_messages'
  ) then
    alter publication supabase_realtime add table public.inbox_messages;
  end if;
end $$;