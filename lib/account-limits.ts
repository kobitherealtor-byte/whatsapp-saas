import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AccountLimits = {
  planCode: string;
  billingStatus: string;
  maxPendingMessages: number;
  maxActiveCampaigns: number;
  maxGroupsPerCampaign: number;
  monthlySendLimit: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

export async function getAccountLimits(userId: string): Promise<AccountLimits> {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from('account_limits')
    .select('plan_code, billing_status, max_pending_messages, max_active_campaigns, max_groups_per_campaign, monthly_send_limit, current_period_start, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const { data: created, error: createError } = await admin
      .from('account_limits')
      .insert({ user_id: userId })
      .select('plan_code, billing_status, max_pending_messages, max_active_campaigns, max_groups_per_campaign, monthly_send_limit, current_period_start, current_period_end')
      .single();

    if (createError) throw new Error(createError.message);
    return {
      planCode: created.plan_code,
      billingStatus: created.billing_status,
      maxPendingMessages: created.max_pending_messages,
      maxActiveCampaigns: created.max_active_campaigns,
      maxGroupsPerCampaign: created.max_groups_per_campaign,
      monthlySendLimit: created.monthly_send_limit,
      currentPeriodStart: created.current_period_start,
      currentPeriodEnd: created.current_period_end,
    };
  }

  return {
    planCode: existing.plan_code,
    billingStatus: existing.billing_status,
    maxPendingMessages: existing.max_pending_messages,
    maxActiveCampaigns: existing.max_active_campaigns,
    maxGroupsPerCampaign: existing.max_groups_per_campaign,
    monthlySendLimit: existing.monthly_send_limit,
    currentPeriodStart: existing.current_period_start,
    currentPeriodEnd: existing.current_period_end,
  };
}

export async function assertCanCreatePendingMessage(userId: string) {
  const admin = createAdminClient();
  const limits = await getAccountLimits(userId);

  const { count, error } = await admin
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'processing']);

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limits.maxPendingMessages) {
    throw new Error(`הגעת למגבלת ${limits.maxPendingMessages} הודעות פעילות בחשבון.`);
  }

  return limits;
}

export async function assertCanActivateCampaign(userId: string) {
  const admin = createAdminClient();
  const limits = await getAccountLimits(userId);

  const { count, error } = await admin
    .from('group_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= limits.maxActiveCampaigns) {
    throw new Error(`הגעת למגבלת ${limits.maxActiveCampaigns} קמפיינים פעילים בחשבון.`);
  }

  return limits;
}

export async function assertCampaignGroupLimit(userId: string, groupCount: number) {
  const limits = await getAccountLimits(userId);

  if (groupCount > limits.maxGroupsPerCampaign) {
    throw new Error(`אפשר לבחור עד ${limits.maxGroupsPerCampaign} קבוצות בקמפיין אחד.`);
  }

  return limits;
}
