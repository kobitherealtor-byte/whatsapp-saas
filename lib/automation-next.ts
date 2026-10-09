import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getNextAutomationRunAt() {
  const admin = createAdminClient();

  const [
    messagesResult,
    campaignsResult,
    dispatchesResult,
  ] = await Promise.all([
    admin
      .from('scheduled_messages')
      .select('scheduled_time')
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from('group_campaigns')
      .select('next_run_at')
      .eq('status', 'active')
      .not('next_run_at', 'is', null)
      .order('next_run_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from('campaign_dispatches')
      .select('available_at')
      .eq('status', 'pending')
      .order('available_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [
    messagesResult.error,
    campaignsResult.error,
    dispatchesResult.error,
  ].find(Boolean);

  if (firstError) throw new Error(firstError.message);

  const candidates = [
    messagesResult.data?.scheduled_time,
    campaignsResult.data?.next_run_at,
    dispatchesResult.data?.available_at,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!candidates[0]) return null;

  const minimumNextRun = Date.now() + 15_000;
  const nextTime = Math.max(candidates[0].getTime(), minimumNextRun);

  return new Date(nextTime).toISOString();
}
