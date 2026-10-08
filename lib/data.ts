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
