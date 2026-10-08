-- Security hardening for Auth and GREEN API connection metadata.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke select on table public.whatsapp_connections from anon, authenticated;

grant select (
  id,
  user_id,
  phone_number,
  instance_id,
  status,
  created_at,
  updated_at,
  provider,
  connected_at,
  last_error
) on table public.whatsapp_connections to authenticated;
