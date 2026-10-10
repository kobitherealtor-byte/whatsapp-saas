import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logoutGreenApiInstance } from '@/lib/green-api';
import { safeUserApiError } from '@/lib/api-error';
import { assertUserRateLimit } from '@/lib/rate-limit';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    await assertUserRateLimit({
      userId: user.id,
      bucket: 'whatsapp-disconnect',
      limit: 3,
      windowSeconds: 10 * 60,
    });

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
    const safe = safeUserApiError(error, 'לא הצלחנו לנתק את חיבור ה-WhatsApp.');
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
