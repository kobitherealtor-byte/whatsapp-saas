'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('צריך להתחבר למערכת.');
  }

  return { supabase, user };
}

export async function setWhatsAppGroupEnabled(id: string, enabled: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('whatsapp_groups')
    .update({ user_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/groups');
  revalidatePath('/publisher');
  revalidatePath('/publisher/new');
  revalidatePath('/dashboard');
}
