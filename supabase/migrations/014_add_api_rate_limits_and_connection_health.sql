create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant all on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.api_rate_limits%rowtype;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  select *
  into v_row
  from public.api_rate_limits
  where rate_key = p_key
  for update;

  if not found then
    insert into public.api_rate_limits(rate_key, window_started_at, hits, updated_at)
    values (p_key, now(), 1, now());
    return true;
  end if;

  if v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    update public.api_rate_limits
    set window_started_at = now(), hits = 1, updated_at = now()
    where rate_key = p_key;
    return true;
  end if;

  if v_row.hits >= p_limit then
    return false;
  end if;

  update public.api_rate_limits
  set hits = hits + 1, updated_at = now()
  where rate_key = p_key;

  return true;
end;
$$;

revoke execute on function public.consume_api_rate_limit(text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer)
  to service_role;

alter table public.whatsapp_connections
  add column if not exists provider_state text,
  add column if not exists last_checked_at timestamptz;