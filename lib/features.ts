import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAccountLimits } from '@/lib/account-limits';

import { FEATURE_KEYS, type FeatureKey } from '@/lib/feature-definitions';

export type FeatureEntitlement = {
  key: FeatureKey;
  enabled: boolean;
  source: 'plan' | 'admin' | 'billing' | 'system';
  planEnabled: boolean;
  overrideEnabled: boolean | null;
  overrideExpiresAt: string | null;
};

export async function getFeatureEntitlements(userId: string) {
  const admin = createAdminClient();
  const limits = await getAccountLimits(userId);

  const [{ data: planRows, error: planError }, { data: overrides, error: overrideError }] =
    await Promise.all([
      admin
        .from('plan_features')
        .select('feature_key, enabled')
        .eq('plan_code', limits.planCode),
      admin
        .from('account_feature_overrides')
        .select('feature_key, enabled, source, expires_at')
        .eq('user_id', userId),
    ]);

  if (planError) throw new Error(planError.message);
  if (overrideError) throw new Error(overrideError.message);

  const planMap = new Map(
    (planRows ?? []).map((row) => [row.feature_key as FeatureKey, Boolean(row.enabled)]),
  );

  const now = Date.now();
  const activeOverrides = (overrides ?? []).filter(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > now,
  );

  const overrideMap = new Map<
    FeatureKey,
    (typeof activeOverrides)[number]
  >();

  const precedence: Record<string, number> = {
    billing: 1,
    admin: 2,
    system: 3,
  };

  for (const row of activeOverrides) {
    const key = row.feature_key as FeatureKey;
    const current = overrideMap.get(key);
    if (
      !current ||
      (precedence[row.source] ?? 0) > (precedence[current.source] ?? 0)
    ) {
      overrideMap.set(key, row);
    }
  }

  const entitlements = {} as Record<FeatureKey, FeatureEntitlement>;

  for (const key of FEATURE_KEYS) {
    const planEnabled = planMap.get(key) ?? false;
    const override = overrideMap.get(key);
    const overrideEnabled = override ? Boolean(override.enabled) : null;

    entitlements[key] = {
      key,
      enabled: override ? Boolean(override.enabled) : planEnabled,
      source: override
        ? (override.source as 'admin' | 'billing' | 'system')
        : 'plan',
      planEnabled,
      overrideEnabled,
      overrideExpiresAt: override?.expires_at ?? null,
    };
  }

  return entitlements;
}

export async function assertFeatureEnabled(
  userId: string,
  featureKey: FeatureKey,
) {
  const entitlements = await getFeatureEntitlements(userId);
  const entitlement = entitlements[featureKey];

  if (!entitlement.enabled) {
    throw new Error('האפשרות הזאת אינה כלולה בחבילה של החשבון.');
  }

  return entitlement;
}


export async function setBillingFeatureEntitlement(
  userId: string,
  featureKey: FeatureKey,
  enabled: boolean | null,
  expiresAt?: string | null,
) {
  const admin = createAdminClient();

  if (enabled === null) {
    const { error } = await admin
      .from('account_feature_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('source', 'billing');

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin
    .from('account_feature_overrides')
    .upsert(
      {
        user_id: userId,
        feature_key: featureKey,
        enabled,
        source: 'billing',
        expires_at: expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,feature_key,source' },
    );

  if (error) throw new Error(error.message);
}
