'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateBusinessProfile(input: { businessName: string }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('צריך להתחבר למערכת.');
  }

  const businessName = input.businessName.trim();
  if (businessName.length > 100) {
    throw new Error('שם העסק ארוך מדי.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      business_name: businessName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/account');
  revalidatePath('/dashboard');
}
