create table if not exists public.plan_features (
  plan_code text not null,
  feature_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_code, feature_key)
);

create table if not exists public.account_feature_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  source text not null default 'admin'
    check (source in ('admin','billing','system')),
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

alter table public.plan_features enable row level security;
alter table public.account_feature_overrides enable row level security;

revoke all on public.plan_features from public, anon, authenticated;
revoke all on public.account_feature_overrides from public, anon, authenticated;
grant all on public.plan_features to service_role;
grant all on public.account_feature_overrides to service_role;

insert into public.plan_features(plan_code, feature_key, enabled)
values
  ('beta','scheduler',true),
  ('beta','group_publisher',true),
  ('beta','broadcasts',true),
  ('beta','inbox',true),
  ('beta','embedded_inbox',true),
  ('beta','holiday_guard',true),
  ('beta','media_upload',true)
on conflict (plan_code, feature_key)
do update set enabled=excluded.enabled, updated_at=now();

create index if not exists account_feature_overrides_user_idx
  on public.account_feature_overrides(user_id);

create index if not exists account_feature_overrides_expiry_idx
  on public.account_feature_overrides(expires_at)
  where expires_at is not null;