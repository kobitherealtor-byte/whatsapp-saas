import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('Unauthorized');

  const admin = createAdminClient();
  const { data, error: adminError } = await admin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) throw new Error(adminError.message);
  if (!data) throw new Error('Forbidden');

  return { user, admin };
}

export async function isCurrentUserAdmin() {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export type AdminCustomerRow = {
  id: string;
  email: string;
  businessName: string | null;
  createdAt: string;
  whatsappStatus: string;
  phoneNumber: string | null;
  providerState: string | null;
  planCode: string;
  billingStatus: string;
  monthlySendLimit: number;
  sentThisPeriod: number;
  pendingMessages: number;
  activeGroupCampaigns: number;
  activeBroadcasts: number;
};

export async function getAdminDashboardData() {
  const { admin } = await requireAdmin();

  const [{ data: authPage, error: authError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from('profiles').select('id, business_name, created_at'),
    ]);

  if (authError) throw new Error(authError.message);
  if (profilesError) throw new Error(profilesError.message);

  const users = authPage.users ?? [];
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    return { customers: [] as AdminCustomerRow[], totals: { customers: 0, connected: 0, active: 0, failed24h: 0 } };
  }

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    connectionsResult,
    limitsResult,
    sendsResult,
    pendingResult,
    groupCampaignsResult,
    broadcastsResult,
    failed24hResult,
  ] = await Promise.all([
    admin
      .from('whatsapp_connections')
      .select('user_id, status, phone_number, provider_state')
      .in('user_id', userIds),
    admin
      .from('account_limits')
      .select('user_id, plan_code, billing_status, monthly_send_limit, current_period_start, current_period_end')
      .in('user_id', userIds),
    admin
      .from('send_logs')
      .select('user_id')
      .eq('status', 'sent')
      .gte('created_at', periodStart)
      .in('user_id', userIds),
    admin
      .from('scheduled_messages')
      .select('user_id')
      .in('status', ['pending', 'processing'])
      .in('user_id', userIds),
    admin
      .from('group_campaigns')
      .select('user_id')
      .eq('status', 'active')
      .in('user_id', userIds),
    admin
      .from('broadcast_campaigns')
      .select('user_id')
      .eq('status', 'active')
      .in('user_id', userIds),
    admin
      .from('send_logs')
      .select('user_id')
      .eq('status', 'failed')
      .gte('created_at', since24h)
      .in('user_id', userIds),
  ]);

  for (const result of [
    connectionsResult,
    limitsResult,
    sendsResult,
    pendingResult,
    groupCampaignsResult,
    broadcastsResult,
    failed24hResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));
  const connectionByUser = new Map((connectionsResult.data ?? []).map((row) => [row.user_id, row]));
  const limitsByUser = new Map((limitsResult.data ?? []).map((row) => [row.user_id, row]));

  const countByUser = (rows: Array<{ user_id: string }> | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
    return counts;
  };

  const sentByUser = countByUser(sendsResult.data);
  const pendingByUser = countByUser(pendingResult.data);
  const groupByUser = countByUser(groupCampaignsResult.data);
  const broadcastsByUser = countByUser(broadcastsResult.data);

  const customers: AdminCustomerRow[] = users.map((user) => {
    const profile = profileById.get(user.id);
    const connection = connectionByUser.get(user.id);
    const limits = limitsByUser.get(user.id);

    return {
      id: user.id,
      email: user.email ?? 'ללא אימייל',
      businessName: profile?.business_name ?? null,
      createdAt: user.created_at,
      whatsappStatus: connection?.status ?? 'disconnected',
      phoneNumber: connection?.phone_number ?? null,
      providerState: connection?.provider_state ?? null,
      planCode: limits?.plan_code ?? 'beta',
      billingStatus: limits?.billing_status ?? 'beta',
      monthlySendLimit: Number(limits?.monthly_send_limit ?? 10000),
      sentThisPeriod: sentByUser.get(user.id) ?? 0,
      pendingMessages: pendingByUser.get(user.id) ?? 0,
      activeGroupCampaigns: groupByUser.get(user.id) ?? 0,
      activeBroadcasts: broadcastsByUser.get(user.id) ?? 0,
    };
  });

  return {
    customers,
    totals: {
      customers: customers.length,
      connected: customers.filter((customer) => customer.whatsappStatus === 'connected').length,
      active: customers.filter((customer) => ['beta', 'trialing', 'active'].includes(customer.billingStatus)).length,
      failed24h: failed24hResult.data?.length ?? 0,
    },
  };
}


export async function getAdminCustomerDetail(customerId: string) {
  const { admin } = await requireAdmin();

  const [{ data: authUserResult, error: authError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin.auth.admin.getUserById(customerId),
      admin
        .from('profiles')
        .select('id, business_name, created_at')
        .eq('id', customerId)
        .maybeSingle(),
    ]);

  if (authError) throw new Error(authError.message);
  if (profileError) throw new Error(profileError.message);
  if (!authUserResult.user) throw new Error('Customer not found');

  const [
    connectionResult,
    limitsResult,
    recentLogsResult,
    recentAuditResult,
    pendingResult,
    groupsResult,
    broadcastsResult,
  ] = await Promise.all([
    admin
      .from('whatsapp_connections')
      .select('status, phone_number, provider_state, last_checked_at, last_error, connected_at')
      .eq('user_id', customerId)
      .maybeSingle(),
    admin
      .from('account_limits')
      .select('plan_code, billing_status, max_pending_messages, max_active_campaigns, max_groups_per_campaign, max_broadcast_recipients, monthly_send_limit, current_period_start, current_period_end')
      .eq('user_id', customerId)
      .maybeSingle(),
    admin
      .from('send_logs')
      .select('id, kind, destination, status, detail, error_message, sent_at, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('audit_events')
      .select('id, event_type, entity_type, entity_id, metadata, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('scheduled_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerId)
      .in('status', ['pending', 'processing']),
    admin
      .from('group_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerId)
      .eq('status', 'active'),
    admin
      .from('broadcast_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerId)
      .eq('status', 'active'),
  ]);

  for (const result of [
    connectionResult,
    limitsResult,
    recentLogsResult,
    recentAuditResult,
    pendingResult,
    groupsResult,
    broadcastsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const limits = limitsResult.data;

  const entitlements = await getFeatureEntitlements(customerId);

  return {
    customer: {
      id: customerId,
      email: authUserResult.user.email ?? 'ללא אימייל',
      businessName: profile?.business_name ?? null,
      createdAt: authUserResult.user.created_at,
      lastSignInAt: authUserResult.user.last_sign_in_at ?? null,
    },
    connection: connectionResult.data,
    limits: {
      planCode: limits?.plan_code ?? 'beta',
      billingStatus: limits?.billing_status ?? 'beta',
      maxPendingMessages: Number(limits?.max_pending_messages ?? 500),
      maxActiveCampaigns: Number(limits?.max_active_campaigns ?? 50),
      maxGroupsPerCampaign: Number(limits?.max_groups_per_campaign ?? 100),
      maxBroadcastRecipients: Number(limits?.max_broadcast_recipients ?? 2000),
      monthlySendLimit: Number(limits?.monthly_send_limit ?? 10000),
      currentPeriodStart: limits?.current_period_start ?? null,
      currentPeriodEnd: limits?.current_period_end ?? null,
    },
    usage: {
      pendingMessages: pendingResult.count ?? 0,
      activeGroupCampaigns: groupsResult.count ?? 0,
      activeBroadcasts: broadcastsResult.count ?? 0,
    },
    recentLogs: recentLogsResult.data ?? [],
    recentAudit: recentAuditResult.data ?? [],
    entitlements,
  };
}


export async function getAdminPlans() {
  const { admin } = await requireAdmin();

  const [{ data: plans, error: plansError }, { data: features, error: featuresError }] =
    await Promise.all([
      admin
        .from('plan_catalog')
        .select('plan_code, display_name, max_pending_messages, max_active_campaigns, max_groups_per_campaign, max_broadcast_recipients, monthly_send_limit, is_active, updated_at')
        .order('created_at', { ascending: true }),
      admin
        .from('plan_features')
        .select('plan_code, feature_key, enabled'),
    ]);

  if (plansError) throw new Error(plansError.message);
  if (featuresError) throw new Error(featuresError.message);

  const featureMap = new Map<string, Record<string, boolean>>();
  for (const row of features ?? []) {
    const current = featureMap.get(row.plan_code) ?? {};
    current[row.feature_key] = Boolean(row.enabled);
    featureMap.set(row.plan_code, current);
  }

  return (plans ?? []).map((plan) => ({
    planCode: plan.plan_code,
    displayName: plan.display_name,
    maxPendingMessages: plan.max_pending_messages,
    maxActiveCampaigns: plan.max_active_campaigns,
    maxGroupsPerCampaign: plan.max_groups_per_campaign,
    maxBroadcastRecipients: plan.max_broadcast_recipients,
    monthlySendLimit: plan.monthly_send_limit,
    isActive: Boolean(plan.is_active),
    updatedAt: plan.updated_at,
    features: featureMap.get(plan.plan_code) ?? {},
  }));
}
