alter table public.scheduled_messages
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

create index if not exists scheduled_messages_due_idx
  on public.scheduled_messages(scheduled_time)
  where status = 'pending';

create or replace function public.claim_due_scheduled_messages(p_limit integer default 25)
returns table (
  id uuid,
  user_id uuid,
  recipient_number text,
  recipient_name text,
  message_body text,
  media_url text,
  scheduled_time timestamptz,
  timezone text,
  recurrence text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select sm.id
    from public.scheduled_messages sm
    where sm.status::text = 'pending'
      and sm.scheduled_time <= now()
    order by sm.scheduled_time asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ),
  claimed as (
    update public.scheduled_messages sm
    set status = 'processing',
        claim_token = gen_random_uuid(),
        claimed_at = now(),
        updated_at = now()
    from due
    where sm.id = due.id
    returning sm.*
  )
  select
    c.id,
    c.user_id,
    c.recipient_number::text,
    c.recipient_name::text,
    c.message_body,
    c.media_url,
    c.scheduled_time,
    c.timezone::text,
    c.recurrence::text,
    c.claim_token
  from claimed c
  order by c.scheduled_time asc;
end;
$$;

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
    if v_message.recurrence::text = 'none' then
      update public.scheduled_messages
      set status = 'sent',
          sent_at = now(),
          external_message_id = p_external_message_id,
          error_text = null,
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

  return 'failed';
end;
$$;

create or replace function public.recover_stale_message_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.scheduled_messages
  set status = 'pending',
      claim_token = null,
      claimed_at = null,
      scheduled_time = greatest(scheduled_time, now()),
      updated_at = now()
  where status::text = 'processing'
    and claimed_at < now() - interval '10 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.claim_due_scheduled_messages(integer) from public, anon, authenticated;
revoke execute on function public.finalize_scheduled_message(uuid, uuid, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.recover_stale_message_claims() from public, anon, authenticated;

grant execute on function public.claim_due_scheduled_messages(integer) to service_role;
grant execute on function public.finalize_scheduled_message(uuid, uuid, boolean, text, text) to service_role;
grant execute on function public.recover_stale_message_claims() to service_role;
