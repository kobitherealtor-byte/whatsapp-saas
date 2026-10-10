create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_account_feature_enabled(p_feature_key text)
returns boolean
language sql
security definer
set search_path=public,private
as $$
  select public.account_feature_enabled(auth.uid(), p_feature_key);
$$;

revoke all on function private.current_account_feature_enabled(text) from public, anon;
grant execute on function private.current_account_feature_enabled(text)
  to authenticated, service_role;

drop policy if exists message_media_insert_own_folder on storage.objects;
create policy message_media_insert_own_folder
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id='message-media'
    and (storage.foldername(name))[1]=auth.uid()::text
    and private.current_account_feature_enabled('media_upload')
  );

drop policy if exists message_media_update_own_folder on storage.objects;
create policy message_media_update_own_folder
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id='message-media'
    and (storage.foldername(name))[1]=auth.uid()::text
  )
  with check (
    bucket_id='message-media'
    and (storage.foldername(name))[1]=auth.uid()::text
    and private.current_account_feature_enabled('media_upload')
  );

drop function if exists public.current_account_feature_enabled(text);