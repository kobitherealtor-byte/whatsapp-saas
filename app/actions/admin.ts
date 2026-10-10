'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { writeAuditEvent } from '@/lib/audit';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/feature-definitions';
import { applyBillingState } from '@/lib/billing';

const allowedStatuses = new Set([
  'beta',
  'trialing',
  'active',
  'past_due',
  'cancelled',
]);

export async function updateCustomerAccount(
  customerId: string,
  input: {
    planCode: string;
    billingStatus: string;
    monthlySendLimit: number;
    maxPendingMessages: number;
    maxActiveCampaigns: number;
    maxGroupsPerCampaign: number;
    maxBroadcastRecipients: number;
  },
) {
  const { user: adminUser, admin } = await requireAdmin();

  if (!customerId) throw new Error('לקוח לא תקין.');
  if (!allowedStatuses.has(input.billingStatus)) {
    throw new Error('סטטוס החשבון אינו תקין.');
  }

  const planCode = input.planCode.trim().slice(0, 60) || 'beta';
  const monthlySendLimit = Math.max(1, Math.min(Math.round(input.monthlySendLimit), 1_000_000));
  const maxPendingMessages = Math.max(1, Math.min(Math.round(input.maxPendingMessages), 100_000));
  const maxActiveCampaigns = Math.max(1, Math.min(Math.round(input.maxActiveCampaigns), 10_000));
  const maxGroupsPerCampaign = Math.max(1, Math.min(Math.round(input.maxGroupsPerCampaign), 10_000));
  const maxBroadcastRecipients = Math.max(1, Math.min(Math.round(input.maxBroadcastRecipients), 100_000));

  const { error } = await admin
    .from('account_limits')
    .upsert(
      {
        user_id: customerId,
        plan_code: planCode,
        billing_status: input.billingStatus,
        monthly_send_limit: monthlySendLimit,
        max_pending_messages: maxPendingMessages,
        max_active_campaigns: maxActiveCampaigns,
        max_groups_per_campaign: maxGroupsPerCampaign,
        max_broadcast_recipients: maxBroadcastRecipients,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: 'admin.customer_limits.updated',
    entityType: 'account_limits',
    entityId: customerId,
    metadata: {
      customerId,
      planCode,
      billingStatus: input.billingStatus,
      monthlySendLimit,
      maxPendingMessages,
      maxActiveCampaigns,
      maxGroupsPerCampaign,
      maxBroadcastRecipients,
    },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/${customerId}`);
}

export async function setCustomerSuspended(
  customerId: string,
  suspended: boolean,
) {
  const { user: adminUser, admin } = await requireAdmin();

  const nextStatus = suspended ? 'cancelled' : 'beta';

  const { error } = await admin
    .from('account_limits')
    .upsert(
      {
        user_id: customerId,
        billing_status: nextStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: suspended ? 'admin.customer.suspended' : 'admin.customer.reactivated',
    entityType: 'account_limits',
    entityId: customerId,
    metadata: { customerId, billingStatus: nextStatus },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/${customerId}`);
}


export async function setCustomerFeatureOverride(
  customerId: string,
  featureKey: FeatureKey,
  mode: 'inherit' | 'enabled' | 'disabled',
) {
  const { user: adminUser, admin } = await requireAdmin();

  if (!FEATURE_KEYS.includes(featureKey)) {
    throw new Error('פיצ׳ר לא תקין.');
  }

  if (mode === 'inherit') {
    const { error } = await admin
      .from('account_feature_overrides')
      .delete()
      .eq('user_id', customerId)
      .eq('feature_key', featureKey)
      .eq('source', 'admin');

    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from('account_feature_overrides')
      .upsert(
        {
          user_id: customerId,
          feature_key: featureKey,
          enabled: mode === 'enabled',
          source: 'admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,feature_key,source' },
      );

    if (error) throw new Error(error.message);
  }

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: 'admin.customer_feature.changed',
    entityType: 'account_feature_override',
    entityId: customerId,
    metadata: { customerId, featureKey, mode },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/${customerId}`);
  revalidatePath('/billing');
}

export async function setCustomerFeatureOverrides(
  customerId: string,
  changes: Array<{
    featureKey: FeatureKey;
    mode: 'inherit' | 'enabled' | 'disabled';
  }>,
) {
  for (const change of changes) {
    await setCustomerFeatureOverride(customerId, change.featureKey, change.mode);
  }
}


export async function savePlanDefinition(input: {
  planCode: string;
  displayName: string;
  maxPendingMessages: number;
  maxActiveCampaigns: number;
  maxGroupsPerCampaign: number;
  maxBroadcastRecipients: number;
  monthlySendLimit: number;
  isActive: boolean;
  features: Partial<Record<FeatureKey, boolean>>;
}) {
  const { user: adminUser, admin } = await requireAdmin();

  const planCode = input.planCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!planCode) throw new Error('קוד החבילה אינו תקין.');
  if (!input.displayName.trim()) throw new Error('שם החבילה חסר.');

  const planRow = {
    plan_code: planCode,
    display_name: input.displayName.trim().slice(0, 80),
    max_pending_messages: Math.max(1, Math.round(input.maxPendingMessages)),
    max_active_campaigns: Math.max(1, Math.round(input.maxActiveCampaigns)),
    max_groups_per_campaign: Math.max(1, Math.round(input.maxGroupsPerCampaign)),
    max_broadcast_recipients: Math.max(1, Math.round(input.maxBroadcastRecipients)),
    monthly_send_limit: Math.max(1, Math.round(input.monthlySendLimit)),
    is_active: Boolean(input.isActive),
    updated_at: new Date().toISOString(),
  };

  const { error: planError } = await admin
    .from('plan_catalog')
    .upsert(planRow, { onConflict: 'plan_code' });

  if (planError) throw new Error(planError.message);

  const featureRows = FEATURE_KEYS.map((featureKey) => ({
    plan_code: planCode,
    feature_key: featureKey,
    enabled: Boolean(input.features[featureKey]),
    updated_at: new Date().toISOString(),
  }));

  const { error: featureError } = await admin
    .from('plan_features')
    .upsert(featureRows, { onConflict: 'plan_code,feature_key' });

  if (featureError) throw new Error(featureError.message);

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: 'admin.plan.saved',
    entityType: 'plan_catalog',
    entityId: planCode,
    metadata: {
      planCode,
      isActive: planRow.is_active,
      enabledFeatures: FEATURE_KEYS.filter((key) => Boolean(input.features[key])),
    },
  });

  revalidatePath('/admin/plans');
  revalidatePath('/admin');
}

export async function applyCustomerPlan(
  customerId: string,
  planCode: string,
  billingStatus: 'beta' | 'trialing' | 'active' | 'past_due' | 'cancelled',
) {
  const { user: adminUser, admin } = await requireAdmin();

  const { error } = await admin.rpc('apply_plan_to_account', {
    p_user_id: customerId,
    p_plan_code: planCode,
    p_billing_status: billingStatus,
  });

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: 'admin.customer_plan.applied',
    entityType: 'account_limits',
    entityId: customerId,
    metadata: { customerId, planCode, billingStatus },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/${customerId}`);
  revalidatePath('/billing');
}


export async function simulateBillingEvent(input: {
  customerId: string;
  planCode: string;
  billingStatus: 'beta' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  enabledAddons: FeatureKey[];
}) {
  const { user: adminUser } = await requireAdmin();

  const eventId = 'mock_' + crypto.randomUUID();

  await applyBillingState({
    userId: input.customerId,
    provider: 'mock',
    eventId,
    eventType: 'admin.mock_billing_event',
    planCode: input.planCode,
    billingStatus: input.billingStatus,
    enabledAddons: input.enabledAddons,
    externalCustomerId: 'mock_customer_' + input.customerId,
    externalSubscriptionId: 'mock_subscription_' + input.customerId,
    payload: {
      source: 'admin',
      adminUserId: adminUser.id,
      enabledAddons: input.enabledAddons,
    },
  });

  await writeAuditEvent({
    userId: adminUser.id,
    eventType: 'admin.billing.mock_applied',
    entityType: 'billing_accounts',
    entityId: input.customerId,
    metadata: {
      customerId: input.customerId,
      planCode: input.planCode,
      billingStatus: input.billingStatus,
      enabledAddons: input.enabledAddons,
      eventId,
    },
  });

  revalidatePath('/admin');
  revalidatePath(\`/admin/\${input.customerId}\`);
  revalidatePath('/billing');

  return { eventId };
}
