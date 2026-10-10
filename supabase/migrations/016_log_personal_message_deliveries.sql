create or replace function public.finalize_scheduled_message(
  p_id uuid,
  p_claim_token uuid,
  p_success boolean,
  p_external_message_id text default null,
  p_error_text text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.scheduled_messages%rowtype;
  v_next timestamptz;
begin
  select *
  into v_message
  from public.scheduled_messages
  where id = p_id
    and claim_token = p_claim_token
    and status::text = 'processing'
  for update;

  if not found then
    return 'stale_claim';
  end if;

  if p_success then
    insert into public.send_logs(
      user_id, entity_type, entity_id, recipient_id, status, error_message,
      sent_at, kind, ref_id, destination, detail, external_message_id, created_at
    ) values (
      v_message.user_id, 'scheduled_message', v_message.id,
      v_message.recipient_number, 'sent', null, now(),
      'scheduled_message', v_message.id, v_message.recipient_number,
      v_message.message_body, p_external_message_id, now()
    );

    if v_message.recurrence::text = 'none' then
      update public.scheduled_messages
      set status = 'sent',
          sent_at = now(),
          external_message_id = p_external_message_id,
          error_text = null,
          retry_count = 0,
          claim_token = null,
          claimed_at = null,
          updated_at = now()
      where id = p_id;
      return 'sent';
    end if;

    if v_message.recurrence::text = 'daily' then
      v_next := (
        (v_message.scheduled_time at time zone coalesce(v_message.timezone, 'Asia/Jerusalem'))
        + interval '1 day'
      ) at time zone coalesce(v_message.timezone, 'Asia/Jerusalem');
    elsif v_message.recurrence::text = 'weekly' then
      v_next := (
        (v_message.scheduled_time at time zone coalesce(v_message.timezone, 'Asia/Jerusalem'))
        + interval '7 days'
      ) at time zone coalesce(v_message.timezone, 'Asia/Jerusalem');
    elsif v_message.recurrence::text = 'monthly' then
      v_next := (
        (v_message.scheduled_time at time zone coalesce(v_message.timezone, 'Asia/Jerusalem'))
        + interval '1 month'
      ) at time zone coalesce(v_message.timezone, 'Asia/Jerusalem');
    else
      update public.scheduled_messages
      set status = 'failed',
          error_text = 'Unsupported recurrence type',
          claim_token = null,
          claimed_at = null,
          updated_at = now()
      where id = p_id;
      return 'failed';
    end if;

    update public.scheduled_messages
    set status = 'pending',
        scheduled_time = v_next,
        sent_at = now(),
        external_message_id = p_external_message_id,
        error_text = null,
        retry_count = 0,
        claim_token = null,
        claimed_at = null,
        updated_at = now()
    where id = p_id;

    return 'rescheduled';
  end if;

  if coalesce(v_message.retry_count, 0) < 2 then
    update public.scheduled_messages
    set status = 'pending',
        retry_count = coalesce(retry_count, 0) + 1,
        scheduled_time = now() + interval '5 minutes',
        error_text = p_error_text,
        claim_token = null,
        claimed_at = null,
        updated_at = now()
    where id = p_id;
    return 'retry_scheduled';
  end if;

  update public.scheduled_messages
  set status = 'failed',
      retry_count = coalesce(retry_count, 0) + 1,
      error_text = p_error_text,
      claim_token = null,
      claimed_at = null,
      updated_at = now()
  where id = p_id;

  insert into public.send_logs(
    user_id, entity_type, entity_id, recipient_id, status, error_message,
    sent_at, kind, ref_id, destination, detail, external_message_id, created_at
  ) values (
    v_message.user_id, 'scheduled_message', v_message.id,
    v_message.recipient_number, 'failed', p_error_text, null,
    'scheduled_message', v_message.id, v_message.recipient_number,
    v_message.message_body, null, now()
  );

  return 'failed';
end;
$$;