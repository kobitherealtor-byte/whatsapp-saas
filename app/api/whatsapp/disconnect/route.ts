import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logoutGreenApiInstance } from '@/lib/green-api';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: credential, error: credentialError } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credentialError) throw credentialError;

    if (!credential) {
      return NextResponse.json({ ok: true, status: 'disconnected' });
    }

    await logoutGreenApiInstance({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    await admin
      .from('whatsapp_connections')
      .update({
        status: 'waiting_for_qr',
        phone_number: null,
        connected_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true, status: 'waiting_for_qr' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
