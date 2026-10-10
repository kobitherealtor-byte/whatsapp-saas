alter table public.account_feature_overrides
  drop constraint if exists account_feature_overrides_pkey;

alter table public.account_feature_overrides
  add constraint account_feature_overrides_pkey
  primary key (user_id, feature_key, source);

create index if not exists account_feature_overrides_lookup_idx
  on public.account_feature_overrides(user_id, feature_key, source);