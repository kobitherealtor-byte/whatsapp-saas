import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getNextAutomationRunAt() {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('get_next_automation_run_at');

  if (error) throw new Error(error.message);
  if (!data) return null;

  const date = new Date(data as string);
  if (Number.isNaN(date.getTime())) return null;

  const minimumNextRun = Date.now() + 15_000;
  return new Date(Math.max(date.getTime(), minimumNextRun)).toISOString();
}
