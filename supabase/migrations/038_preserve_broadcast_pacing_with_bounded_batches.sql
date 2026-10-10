drop function if exists public.claim_due_broadcast_recipients(integer);

create function public.claim_due_broadcast_recipients(p_limit integer default 5)
returns table (
  id uuid,
  campaign_id uuid,
  user_id uuid,
  recipient_name text,
  recipient_number text,
  message_body text,
  media_url text,
  send_interval_seconds integer,
  claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_campaign_id uuid;
  v_user_id uuid;
  v_remaining integer;
  v_interval integer;
  v_runtime_limit integer;
begin
  select br.campaign_id, br.user_id, greatest(1, least(coalesce(bc.send_interval_seconds,3),3600))
  into v_campaign_id, v_user_id, v_interval
  from public.broadcast_recipients br
  join public.broadcast_campaigns bc on bc.id=br.campaign_id
  join public.whatsapp_connections wc on wc.user_id=br.user_id
  where br.status='pending'
    and br.available_at <= now()
    and bc.status='active'
    and bc.scheduled_for <= now()
    and wc.status::text='connected'
    and public.account_feature_enabled(br.user_id,'broadcasts')
    and public.account_remaining_send_slots(br.user_id) > 0
  order by br.available_at asc
  limit 1;

  if v_campaign_id is null then
    return;
  end if;

  v_remaining := public.account_remaining_send_slots(v_user_id);
  if v_remaining <= 0 then
    return;
  end if;

  v_runtime_limit := case
    when v_interval > 20 then 1
    else least(5, floor(20.0 / v_interval)::integer + 1)
  end;

  return query
  with due as (
    select br.id
    from public.broadcast_recipients br
    where br.campaign_id=v_campaign_id
      and br.status='pending'
      and br.available_at <= now() + interval '20 seconds'
    order by br.available_at asc
    for update of br skip locked
    limit greatest(
      1,
      least(coalesce(p_limit,5),v_runtime_limit,v_remaining)
    )
  ),
  claimed as (
    update public.broadcast_recipients br
    set status='processing',
        claim_token=gen_random_uuid(),
        claimed_at=now(),
        updated_at=now()
    from due
    where br.id=due.id
    returning br.*
  )
  select
    c.id,
    c.campaign_id,
    c.user_id,
    c.recipient_name,
    c.recipient_number,
    bc.message_body,
    bc.media_url,
    bc.send_interval_seconds,
    c.claim_token
  from claimed c
  join public.broadcast_campaigns bc on bc.id=c.campaign_id
  order by c.available_at asc;
end;
$$;

revoke execute on function public.claim_due_broadcast_recipients(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_broadcast_recipients(integer)
  to service_role;