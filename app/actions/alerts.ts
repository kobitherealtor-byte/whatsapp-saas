'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function markAccountAlertRead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('צריך להתחבר מחדש למערכת.');

  const { error } = await supabase
    .from('account_alerts')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath('/alerts');
}

export async function markAllAccountAlertsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('צריך להתחבר מחדש למערכת.');

  const { error } = await supabase
    .from('account_alerts')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('resolved_at', null);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath('/alerts');
}
