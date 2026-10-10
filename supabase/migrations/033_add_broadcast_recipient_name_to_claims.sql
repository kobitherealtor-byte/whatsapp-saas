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
begin
  select br.campaign_id
  into v_campaign_id
  from public.broadcast_recipients br
  join public.broadcast_campaigns bc on bc.id = br.campaign_id
  join public.whatsapp_connections wc on wc.user_id = br.user_id
  where br.status='pending'
    and br.available_at <= now()
    and bc.status='active'
    and bc.scheduled_for <= now()
    and wc.status::text='connected'
    and public.account_can_send(br.user_id)
    and public.account_feature_enabled(br.user_id, 'broadcasts')
  order by br.available_at asc
  limit 1;

  if v_campaign_id is null then
    return;
  end if;

  return query
  with due as (
    select br.id
    from public.broadcast_recipients br
    where br.campaign_id=v_campaign_id
      and br.status='pending'
      and br.available_at <= now() + interval '20 seconds'
    order by br.available_at asc
    for update of br skip locked
    limit greatest(1, least(coalesce(p_limit,5),5))
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