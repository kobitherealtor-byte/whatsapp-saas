'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { wakeAutomationWorker } from '@/lib/automation-wake';

export async function retryCampaignDispatch(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('צריך להתחבר למערכת.');
  }

  const admin = createAdminClient();

  const { data: dispatch, error: dispatchError } = await admin
    .from('campaign_dispatches')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (dispatchError || !dispatch) {
    throw new Error('השליחה לקבוצה לא נמצאה.');
  }

  if (dispatch.status !== 'failed') {
    throw new Error('אפשר לנסות שוב רק שליחה שנכשלה.');
  }

  const { error } = await admin
    .from('campaign_dispatches')
    .update({
      status: 'pending',
      retry_count: 0,
      claim_token: null,
      claimed_at: null,
      error_text: null,
      available_at: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'failed');

  if (error) throw new Error(error.message);

  revalidatePath('/history');
  revalidatePath('/dashboard');
  await wakeAutomationWorker();
}
