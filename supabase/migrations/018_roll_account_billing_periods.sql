create or replace function public.refresh_account_period(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_updated integer;
begin
  update public.account_limits
  set current_period_start = date_trunc('month', now()),
      current_period_end = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
  where user_id = p_user_id
    and now() >= current_period_end;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke execute on function public.refresh_account_period(uuid) from public, anon, authenticated;
grant execute on function public.refresh_account_period(uuid) to service_role;

create or replace function public.account_can_send(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_limits public.account_limits%rowtype;
  v_sent integer;
begin
  insert into public.account_limits(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform public.refresh_account_period(p_user_id);

  select *
  into v_limits
  from public.account_limits
  where user_id = p_user_id;

  if v_limits.billing_status not in ('beta','trialing','active') then
    return false;
  end if;

  select count(*)
  into v_sent
  from public.send_logs sl
  where sl.user_id = p_user_id
    and sl.status = 'sent'
    and sl.created_at >= v_limits.current_period_start
    and sl.created_at < v_limits.current_period_end;

  return v_sent < v_limits.monthly_send_limit;
end;
$$;