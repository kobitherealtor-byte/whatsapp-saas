'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { writeAuditEvent } from '@/lib/audit';

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
