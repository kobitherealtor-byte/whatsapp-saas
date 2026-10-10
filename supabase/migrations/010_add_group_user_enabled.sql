alter table public.whatsapp_groups
  add column if not exists user_enabled boolean not null default true;

create index if not exists whatsapp_groups_user_enabled_idx
  on public.whatsapp_groups(user_id, is_active, user_enabled);