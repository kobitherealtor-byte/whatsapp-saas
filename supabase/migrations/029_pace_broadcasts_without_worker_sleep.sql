create or replace function public.finalize_broadcast_recipient(
  p_id uuid,
  p_claim_token uuid,
  p_success boolean,
  p_external_message_id text default null,
  p_error_text text default null
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_recipient public.broadcast_recipients%rowtype;
  v_campaign public.broadcast_campaigns%rowtype;
  v_remaining integer;
  v_next_id uuid;
begin
  select *
  into v_recipient
  from public.broadcast_recipients
  where id=p_id
    and claim_token=p_claim_token
    and status='processing'
  for update;

  if not found then
    return 'stale_claim';
  end if;

  select *
  into v_campaign
  from public.broadcast_campaigns
  where id=v_recipient.campaign_id
  for update;

  if p_success then
    update public.broadcast_recipients
    set status='sent',
        sent_at=now(),
        external_message_id=p_external_message_id,
        error_text=null,
        claim_token=null,
        claimed_at=null,
        updated_at=now()
    where id=p_id;

    update public.broadcast_campaigns
    set sent_count=sent_count+1,
        updated_at=now()
    where id=v_recipient.campaign_id;

    insert into public.send_logs(
      user_id, entity_type, entity_id, recipient_id, status,
      error_message, sent_at, kind, ref_id, destination, detail,
      external_message_id, created_at
    ) values (
      v_recipient.user_id, 'broadcast_campaign', v_recipient.campaign_id,
      v_recipient.recipient_number, 'sent', null, now(),
      'broadcast', v_recipient.campaign_id, v_recipient.recipient_number,
      v_campaign.message_body, p_external_message_id, now()
    );
  else
    if coalesce(v_recipient.retry_count,0) < 2 then
      update public.broadcast_recipients
      set status='pending',
          retry_count=coalesce(retry_count,0)+1,
          available_at=now()+interval '5 minutes',
          error_text=p_error_text,
          claim_token=null,
          claimed_at=null,
          updated_at=now()
      where id=p_id;
    else
      update public.broadcast_recipients
      set status='failed',
          retry_count=coalesce(retry_count,0)+1,
          error_text=p_error_text,
          claim_token=null,
          claimed_at=null,
          updated_at=now()
      where id=p_id;

      update public.broadcast_campaigns
      set failed_count=failed_count+1,
          last_error=p_error_text,
          updated_at=now()
      where id=v_recipient.campaign_id;

      insert into public.send_logs(
        user_id, entity_type, entity_id, recipient_id, status,
        error_message, sent_at, kind, ref_id, destination, detail,
        created_at
      ) values (
        v_recipient.user_id, 'broadcast_campaign', v_recipient.campaign_id,
        v_recipient.recipient_number, 'failed', p_error_text, null,
        'broadcast', v_recipient.campaign_id, v_recipient.recipient_number,
        v_campaign.message_body, now()
      );
    end if;
  end if;

  select br.id
  into v_next_id
  from public.broadcast_recipients br
  where br.campaign_id=v_recipient.campaign_id
    and br.status='pending'
    and br.id<>p_id
  order by br.available_at asc, br.created_at asc
  limit 1
  for update skip locked;

  if v_next_id is not null then
    update public.broadcast_recipients
    set available_at=greatest(
          available_at,
          now() + make_interval(secs => greatest(1, least(coalesce(v_campaign.send_interval_seconds,3),3600)))
        ),
        updated_at=now()
    where id=v_next_id;
  end if;

  select count(*)
  into v_remaining
  from public.broadcast_recipients
  where campaign_id=v_recipient.campaign_id
    and status in ('pending','processing');

  if v_remaining = 0 then
    update public.broadcast_campaigns
    set status='completed',
        updated_at=now()
    where id=v_recipient.campaign_id
      and status='active';
  end if;

  if not p_success and coalesce(v_recipient.retry_count,0) < 2 then
    return 'retry_scheduled';
  end if;

  return case when p_success then 'sent' else 'failed' end;
end;
$$;

drop function if exists public.claim_due_broadcast_recipients(integer);

create function public.claim_due_broadcast_recipients(p_limit integer default 1)
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
      and public.account_feature_enabled(br.user_id, 'broadcasts')
    order by br.available_at asc
    for update of br skip locked
    limit 1
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