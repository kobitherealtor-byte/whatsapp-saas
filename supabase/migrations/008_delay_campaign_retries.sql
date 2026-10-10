alter table public.campaign_dispatches
  add column if not exists available_at timestamptz not null default now();

create index if not exists campaign_dispatches_available_idx
  on public.campaign_dispatches(available_at)
  where status='pending';

create or replace function public.claim_pending_campaign_dispatches(p_limit integer default 50)
returns table (
  id uuid,campaign_id uuid,user_id uuid,group_id uuid,
  scheduled_for timestamptz,message_body text,media_url text,
  destination_chat_id text,claim_token uuid
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with due as (
    select cd.id
    from public.campaign_dispatches cd
    where cd.status='pending'
      and cd.available_at<=now()
    order by cd.available_at asc,cd.created_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  ),
  claimed as (
    update public.campaign_dispatches cd
    set status='processing',claim_token=gen_random_uuid(),
        claimed_at=now(),updated_at=now()
    from due where cd.id=due.id
    returning cd.*
  )
  select c.id,c.campaign_id,c.user_id,c.group_id,c.scheduled_for,
         c.message_body,c.media_url,c.destination_chat_id,c.claim_token
  from claimed c
  order by c.available_at asc,c.created_at asc;
end;
$$;

create or replace function public.finalize_campaign_dispatch(
  p_id uuid,p_claim_token uuid,p_success boolean,
  p_external_message_id text default null,p_error_text text default null
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare v_dispatch public.campaign_dispatches%rowtype;
begin
  select * into v_dispatch from public.campaign_dispatches
  where id=p_id and claim_token=p_claim_token and status='processing'
  for update;
  if not found then return 'stale_claim'; end if;

  if p_success then
    update public.campaign_dispatches
    set status='sent',sent_at=now(),external_message_id=p_external_message_id,
        error_text=null,claim_token=null,claimed_at=null,updated_at=now()
    where id=p_id;

    insert into public.send_logs(
      user_id,entity_type,entity_id,recipient_id,status,error_message,sent_at,
      kind,ref_id,destination,detail,external_message_id,created_at
    ) values (
      v_dispatch.user_id,'group_campaign',v_dispatch.campaign_id,
      v_dispatch.destination_chat_id,'sent',null,now(),
      'group_campaign',v_dispatch.campaign_id,v_dispatch.destination_chat_id,
      null,p_external_message_id,now()
    );
    return 'sent';
  end if;

  if coalesce(v_dispatch.retry_count,0)<2 then
    update public.campaign_dispatches
    set status='pending',retry_count=retry_count+1,
        available_at=now()+interval '5 minutes',
        error_text=p_error_text,claim_token=null,claimed_at=null,updated_at=now()
    where id=p_id;
    return 'retry_scheduled';
  end if;

  update public.campaign_dispatches
  set status='failed',retry_count=retry_count+1,error_text=p_error_text,
      claim_token=null,claimed_at=null,updated_at=now()
  where id=p_id;

  insert into public.send_logs(
    user_id,entity_type,entity_id,recipient_id,status,error_message,sent_at,
    kind,ref_id,destination,detail,external_message_id,created_at
  ) values (
    v_dispatch.user_id,'group_campaign',v_dispatch.campaign_id,
    v_dispatch.destination_chat_id,'failed',p_error_text,null,
    'group_campaign',v_dispatch.campaign_id,v_dispatch.destination_chat_id,
    p_error_text,null,now()
  );
  return 'failed';
end;
$$;

revoke execute on function public.claim_pending_campaign_dispatches(integer) from public,anon,authenticated;
revoke execute on function public.finalize_campaign_dispatch(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_pending_campaign_dispatches(integer) to service_role;
grant execute on function public.finalize_campaign_dispatch(uuid,uuid,boolean,text,text) to service_role;
