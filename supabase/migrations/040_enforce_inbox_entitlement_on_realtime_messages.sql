drop policy if exists inbox_messages_select_own on public.inbox_messages;

create policy inbox_messages_select_own
  on public.inbox_messages
  for select
  to authenticated
  using (
    auth.uid()=user_id
    and private.current_account_feature_enabled('inbox')
  );