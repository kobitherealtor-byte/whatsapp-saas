import 'server-only';

import { createClient } from '@/lib/supabase/server';

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
    .select('id, name, message_body, days_of_week, send_time, start_date, end_date, skip_holidays, status, next_run_at, campaign_groups(group_id)')
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
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppGroupRow[];
}

export async function getDashboardData() {
  const { supabase } = await getAuthedClient();
  const nowIso = new Date().toISOString();
  const next24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const [
    connectionResult,
    upcomingResult,
    messagesCountResult,
    campaignsCountResult,
    groupsCountResult,
    failedCountResult,
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
      .from('send_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  const firstError = [
    connectionResult.error,
    upcomingResult.error,
    messagesCountResult.error,
    campaignsCountResult.error,
    groupsCountResult.error,
    failedCountResult.error,
  ].find(Boolean);

  if (firstError) throw new Error(firstError.message);

  return {
    connection: connectionResult.data,
    upcoming: (upcomingResult.data ?? []) as ScheduledMessageRow[],
    scheduledNext24h: messagesCountResult.count ?? 0,
    activeCampaigns: campaignsCountResult.count ?? 0,
    groups: groupsCountResult.count ?? 0,
    failed: failedCountResult.count ?? 0,
  };
}


export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  type: 'scheduler' | 'publisher';
  status: string;
  detail: string;
};

export async function getCalendarEvents() {
  const { supabase } = await getAuthedClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();

  const [messagesResult, campaignsResult] = await Promise.all([
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
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (campaignsResult.error) throw new Error(campaignsResult.error.message);

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

  return [...messageEvents, ...campaignEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
