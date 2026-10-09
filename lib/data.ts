import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ScheduledMessageRow = {
  id: string;
  recipient_name: string | null;
  recipient_number: string;
  message_body: string;
  scheduled_time: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
};

export type CampaignRow = {
  id: string;
  name: string;
  message_body: string;
  days_of_week: number[];
  send_time: string;
  start_date: string;
  end_date: string | null;
  skip_holidays: boolean;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  next_run_at: string | null;
  last_error: string | null;
  prepare_fail_count: number;
  campaign_groups?: Array<{ group_id: string }> | null;
};

export type WhatsAppGroupRow = {
  id: string;
  chat_id: string;
  name: string;
  participant_count: number | null;
};

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { supabase, user };
}

export async function getScheduledMessages() {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('id, recipient_name, recipient_number, message_body, scheduled_time, status')
    .order('scheduled_time', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledMessageRow[];
}

export async function getCampaigns() {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('group_campaigns')
    .select('id, name, message_body, days_of_week, send_time, start_date, end_date, skip_holidays, status, next_run_at, last_error, prepare_fail_count, campaign_groups(group_id)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRow[];
}

export async function getWhatsAppGroups() {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('whatsapp_groups')
    .select('id, chat_id, name, participant_count')
    .eq('is_active', true)
    .eq('user_enabled', true)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppGroupRow[];
}

export async function getDashboardData() {
  const { supabase, user } = await getAuthedClient();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const next24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const [
    connectionResult,
    upcomingResult,
    messagesCountResult,
    campaignsCountResult,
    groupsCountResult,
    broadcastsCountResult,
    failedMessagesCountResult,
    failedBroadcastsCountResult,
    failedDispatchesCountResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('whatsapp_connections')
      .select('status, phone_number')
      .maybeSingle(),
    supabase
      .from('scheduled_messages')
      .select('id, recipient_name, recipient_number, message_body, scheduled_time, status')
      .eq('status', 'pending')
      .gte('scheduled_time', nowIso)
      .order('scheduled_time', { ascending: true })
      .limit(5),
    supabase
      .from('scheduled_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('scheduled_time', nowIso)
      .lte('scheduled_time', next24hIso),
    supabase
      .from('group_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('whatsapp_groups')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('broadcast_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('scheduled_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
    admin
      .from('campaign_dispatches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'failed'),
    admin
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'failed'),
    supabase
      .from('profiles')
      .select('business_name')
      .maybeSingle(),
  ]);

  const firstError = [
    connectionResult.error,
    upcomingResult.error,
    messagesCountResult.error,
    campaignsCountResult.error,
    groupsCountResult.error,
    broadcastsCountResult.error,
    failedMessagesCountResult.error,
    failedDispatchesCountResult.error,
    failedBroadcastsCountResult.error,
    profileResult.error,
  ].find(Boolean);

  if (firstError) throw new Error(firstError.message);

  return {
    connection: connectionResult.data,
    upcoming: (upcomingResult.data ?? []) as ScheduledMessageRow[],
    scheduledNext24h: messagesCountResult.count ?? 0,
    activeCampaigns: campaignsCountResult.count ?? 0,
    groups: groupsCountResult.count ?? 0,
    activeBroadcasts: broadcastsCountResult.count ?? 0,
    failed:
      (failedMessagesCountResult.count ?? 0) +
      (failedDispatchesCountResult.count ?? 0) +
      (failedBroadcastsCountResult.count ?? 0),
    businessName: profileResult.data?.business_name ?? null,
  };
}


export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  type: 'scheduler' | 'publisher' | 'broadcast';
  status: string;
  detail: string;
};

export async function getCalendarEvents() {
  const { supabase } = await getAuthedClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();

  const [messagesResult, campaignsResult, broadcastsResult] = await Promise.all([
    supabase
      .from('scheduled_messages')
      .select('id, recipient_name, recipient_number, message_body, scheduled_time, status')
      .gte('scheduled_time', start)
      .lt('scheduled_time', end)
      .neq('status', 'cancelled')
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('group_campaigns')
      .select('id, name, message_body, next_run_at, status')
      .not('next_run_at', 'is', null)
      .gte('next_run_at', start)
      .lt('next_run_at', end)
      .in('status', ['active', 'paused'])
      .order('next_run_at', { ascending: true }),
    supabase
      .from('broadcast_campaigns')
      .select('id, name, message_body, scheduled_for, status')
      .gte('scheduled_for', start)
      .lt('scheduled_for', end)
      .in('status', ['active', 'paused'])
      .order('scheduled_for', { ascending: true }),
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (campaignsResult.error) throw new Error(campaignsResult.error.message);
  if (broadcastsResult.error) throw new Error(broadcastsResult.error.message);

  const messageEvents: CalendarEvent[] = (messagesResult.data ?? []).map((item) => ({
    id: `message:${item.id}`,
    title: item.recipient_name
      ? `הודעה ל${item.recipient_name}`
      : `הודעה ל${item.recipient_number}`,
    startsAt: item.scheduled_time,
    type: 'scheduler',
    status: item.status,
    detail: item.message_body,
  }));

  const campaignEvents: CalendarEvent[] = (campaignsResult.data ?? [])
    .filter((item) => item.next_run_at)
    .map((item) => ({
      id: `campaign:${item.id}`,
      title: item.name,
      startsAt: item.next_run_at!,
      type: 'publisher',
      status: item.status,
      detail: item.message_body,
    }));

  const broadcastEvents: CalendarEvent[] = (broadcastsResult.data ?? []).map((item) => ({
    id: `broadcast:${item.id}`,
    title: `תפוצה: ${item.name}`,
    startsAt: item.scheduled_for,
    type: 'broadcast',
    status: item.status,
    detail: item.message_body,
  }));

  return [...messageEvents, ...campaignEvents, ...broadcastEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}


export async function getScheduledMessageById(id: string) {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('id, recipient_name, recipient_number, message_body, scheduled_time, status, recurrence, media_url')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledMessageRow & {
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    media_url: string | null;
  };
}

export async function getCampaignById(id: string) {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('group_campaigns')
    .select('id, name, message_body, media_url, days_of_week, send_time, start_date, end_date, skip_holidays, status, next_run_at, campaign_groups(group_id)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  return data as CampaignRow & {
    media_url: string | null;
    campaign_groups: Array<{ group_id: string }>;
  };
}


export type DeliveryHistoryItem = {
  id: string;
  source: 'personal' | 'group';
  title: string;
  destination: string;
  status: 'sent' | 'failed' | 'skipped';
  occurredAt: string;
  detail: string | null;
  error: string | null;
  retryMessageId: string | null;
  retryDispatchId: string | null;
};

export async function getDeliveryHistory() {
  const { supabase, user } = await getAuthedClient();
  const admin = createAdminClient();

  const [messagesResult, dispatchesResult] = await Promise.all([
    supabase
      .from('scheduled_messages')
      .select('id, recipient_name, recipient_number, message_body, status, sent_at, error_text, updated_at')
      .in('status', ['sent', 'failed'])
      .order('updated_at', { ascending: false })
      .limit(150),
    admin
      .from('campaign_dispatches')
      .select('id, campaign_id, group_id, destination_chat_id, message_body, status, error_text, sent_at, updated_at')
      .eq('user_id', user.id)
      .in('status', ['sent', 'failed', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(150),
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (dispatchesResult.error) throw new Error(dispatchesResult.error.message);

  const dispatches = dispatchesResult.data ?? [];
  const groupIds = [...new Set(dispatches.map((item) => item.group_id).filter(Boolean))];
  const campaignIds = [...new Set(dispatches.map((item) => item.campaign_id).filter(Boolean))];

  const [groupsResult, campaignsResult] = await Promise.all([
    groupIds.length
      ? admin.from('whatsapp_groups').select('id, name').in('id', groupIds)
      : Promise.resolve({ data: [], error: null }),
    campaignIds.length
      ? admin.from('group_campaigns').select('id, name').in('id', campaignIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (campaignsResult.error) throw new Error(campaignsResult.error.message);

  const groupNames = new Map((groupsResult.data ?? []).map((item) => [item.id, item.name]));
  const campaignNames = new Map((campaignsResult.data ?? []).map((item) => [item.id, item.name]));

  const personal: DeliveryHistoryItem[] = (messagesResult.data ?? []).map((item) => ({
    id: `message:${item.id}`,
    source: 'personal',
    title: item.recipient_name || 'הודעה אישית',
    destination: item.recipient_number,
    status: item.status as 'sent' | 'failed',
    occurredAt: item.sent_at || item.updated_at,
    detail: item.message_body,
    error: item.error_text,
    retryMessageId: item.status === 'failed' ? item.id : null,
    retryDispatchId: null,
  }));

  const group: DeliveryHistoryItem[] = dispatches.map((item) => ({
    id: `dispatch:${item.id}`,
    source: 'group',
    title: campaignNames.get(item.campaign_id) || 'פרסום לקבוצה',
    destination: groupNames.get(item.group_id) || item.destination_chat_id || 'קבוצת WhatsApp',
    status: item.status as 'sent' | 'failed' | 'skipped',
    occurredAt: item.sent_at || item.updated_at,
    detail: item.message_body,
    error: item.error_text,
    retryMessageId: null,
    retryDispatchId: item.status === 'failed' ? item.id : null,
  }));

  return [...personal, ...group]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 200);
}


export async function getWhatsAppGroupsForManagement() {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('whatsapp_groups')
    .select('id, chat_id, name, participant_count, is_active, user_enabled, synced_at')
    .order('is_active', { ascending: false })
    .order('name');

  if (error) throw new Error(error.message);

  return (data ?? []) as Array<WhatsAppGroupRow & {
    is_active: boolean;
    user_enabled: boolean;
    synced_at: string | null;
  }>;
}


export type CampaignDeliveryStats = {
  campaignId: string;
  sent: number;
  failed: number;
  pending: number;
  processing: number;
  skipped: number;
};

export async function getCampaignDeliveryStats() {
  const { user } = await getAuthedClient();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campaign_dispatches')
    .select('campaign_id, status')
    .eq('user_id', user.id)
    .limit(5000);

  if (error) throw new Error(error.message);

  const map = new Map<string, CampaignDeliveryStats>();

  for (const row of data ?? []) {
    const campaignId = row.campaign_id as string;
    const current =
      map.get(campaignId) ??
      {
        campaignId,
        sent: 0,
        failed: 0,
        pending: 0,
        processing: 0,
        skipped: 0,
      };

    if (row.status === 'sent') current.sent += 1;
    else if (row.status === 'failed') current.failed += 1;
    else if (row.status === 'processing') current.processing += 1;
    else if (row.status === 'skipped') current.skipped += 1;
    else current.pending += 1;

    map.set(campaignId, current);
  }

  return [...map.values()];
}

export type HolidayDateRow = {
  holiday_date: string;
  name: string;
};

export async function getUpcomingHolidayDates(limit = 30) {
  await getAuthedClient();
  const admin = createAdminClient();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const { data, error } = await admin
    .from('holiday_dates')
    .select('holiday_date, name')
    .eq('country_code', 'IL')
    .gte('holiday_date', today)
    .order('holiday_date', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) throw new Error(error.message);
  return (data ?? []) as HolidayDateRow[];
}

export async function getCampaignDispatches(campaignId: string) {
  const { user } = await getAuthedClient();
  const admin = createAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from('group_campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error('Campaign not found');

  const { data: rows, error } = await admin
    .from('campaign_dispatches')
    .select('id, group_id, destination_chat_id, status, error_text, scheduled_for, sent_at, updated_at, retry_count')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .order('scheduled_for', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);

  const groupIds = [...new Set((rows ?? []).map((row) => row.group_id).filter(Boolean))];
  const { data: groups, error: groupsError } = groupIds.length
    ? await admin.from('whatsapp_groups').select('id, name').in('id', groupIds)
    : { data: [], error: null };

  if (groupsError) throw new Error(groupsError.message);
  const groupNames = new Map((groups ?? []).map((group) => [group.id, group.name]));

  return {
    campaign,
    rows: (rows ?? []).map((row) => ({
      id: row.id as string,
      groupName:
        groupNames.get(row.group_id as string) ||
        (row.destination_chat_id as string) ||
        'קבוצת WhatsApp',
      status: row.status as string,
      error: (row.error_text as string | null) ?? null,
      scheduledFor: row.scheduled_for as string,
      sentAt: (row.sent_at as string | null) ?? null,
      updatedAt: row.updated_at as string,
      retryCount: Number(row.retry_count ?? 0),
    })),
  };
}


export type AutomationHealth = {
  status: 'healthy' | 'attention' | 'idle';
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | 'running' | null;
  activity24h: number;
  sent24h: number;
  failed24h: number;
};

export async function getAutomationHealth(): Promise<AutomationHealth> {
  const { user } = await getAuthedClient();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: latest, error: latestError }, { data: recent, error: recentError }] =
    await Promise.all([
      admin
        .from('automation_runs')
        .select('started_at, finished_at, status')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('send_logs')
        .select('status')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .limit(2000),
    ]);

  if (latestError) throw new Error(latestError.message);
  if (recentError) throw new Error(recentError.message);

  const rows = recent ?? [];
  const sent24h = rows.filter((row) => row.status === 'sent').length;
  const failed24h = rows.filter((row) => row.status === 'failed').length;

  return {
    status: !latest
      ? 'idle'
      : latest.status === 'failed'
        ? 'attention'
        : 'healthy',
    lastRunAt: latest?.finished_at ?? latest?.started_at ?? null,
    lastRunStatus: (latest?.status as AutomationHealth['lastRunStatus']) ?? null,
    activity24h: rows.length,
    sent24h,
    failed24h,
  };
}


export type BroadcastCampaignRow = {
  id: string;
  name: string;
  message_body: string;
  media_url: string | null;
  scheduled_for: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  send_interval_seconds: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  last_error: string | null;
  created_at: string;
};

export async function getBroadcastCampaigns() {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from('broadcast_campaigns')
    .select('id, name, message_body, media_url, scheduled_for, status, send_interval_seconds, total_recipients, sent_count, failed_count, skipped_count, last_error, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as BroadcastCampaignRow[];
}

export async function getBroadcastCampaignById(id: string) {
  const { user } = await getAuthedClient();
  const admin = createAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from('broadcast_campaigns')
    .select('id, name, message_body, media_url, scheduled_for, status, send_interval_seconds, total_recipients, sent_count, failed_count, skipped_count, last_error, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error('Broadcast campaign not found');

  const { data: recipients, error: recipientsError } = await admin
    .from('broadcast_recipients')
    .select('id, recipient_name, recipient_number, status, retry_count, sent_at, error_text, available_at, updated_at')
    .eq('campaign_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (recipientsError) throw new Error(recipientsError.message);

  return {
    campaign: campaign as BroadcastCampaignRow,
    recipients: (recipients ?? []) as Array<{
      id: string;
      recipient_name: string | null;
      recipient_number: string;
      status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped' | 'cancelled';
      retry_count: number;
      sent_at: string | null;
      error_text: string | null;
      available_at: string;
      updated_at: string;
    }>,
  };
}
