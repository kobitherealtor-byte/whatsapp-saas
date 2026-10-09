drop function if exists public.claim_due_broadcast_recipients(integer);

create function public.claim_due_broadcast_recipients(p_limit integer default 10)
returns table (
  id uuid,
  campaign_id uuid,
  user_id uuid,
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
begin
  return query
  with due as (
    select br.id
    from public.broadcast_recipients br
    join public.broadcast_campaigns bc on bc.id = br.campaign_id
    join public.whatsapp_connections wc on wc.user_id = br.user_id
    where br.status = 'pending'
      and br.available_at <= now()
      and bc.status = 'active'
      and bc.scheduled_for <= now()
      and wc.status::text = 'connected'
      and public.account_can_send(br.user_id)
    order by br.available_at asc
    for update of br skip locked
    limit greatest(1, least(coalesce(p_limit,10),10))
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
    c.recipient_number,
    bc.message_body,
    bc.media_url,
    bc.send_interval_seconds,
    c.claim_token
  from claimed c
  join public.broadcast_campaigns bc on bc.id = c.campaign_id
  order by c.available_at asc;
end;
$$;

revoke execute on function public.claim_due_broadcast_recipients(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_broadcast_recipients(integer)
  to service_role;