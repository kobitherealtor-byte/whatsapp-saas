do $$
declare
  t text;
  tables text[] := array[
    'account_feature_overrides',
    'admin_users',
    'api_rate_limits',
    'audit_events',
    'automation_runs',
    'billing_webhook_events',
    'campaign_dispatches',
    'green_api_credentials',
    'holiday_dates',
    'plan_catalog',
    'plan_features',
    'system_maintenance_runs'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists internal_no_direct_access on public.%I', t);
    execute format(
      'create policy internal_no_direct_access on public.%I for all to authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;