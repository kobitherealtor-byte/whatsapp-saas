import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInstanceState, getWaSettings } from '@/lib/green-api';
import { assertUserRateLimit } from '@/lib/rate-limit';
import { wakeAutomationWorker } from '@/lib/automation-wake';
import { safeUserApiError } from '@/lib/api-error';

function mapState(state: string | null) {
  if (!state) return 'creating';
  if (state === 'authorized') return 'connected';
  if (state === 'notAuthorized') return 'waiting_for_qr';
  if (state === 'blocked' || state === 'suspended' || state === 'yellowCard') return 'error';
  return 'creating';
}

export async function GET() {
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
      bucket: 'whatsapp-status',
      limit: 40,
      windowSeconds: 60,
    });

    const admin = createAdminClient();

    const { data: credential, error: credentialError } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credentialError) throw credentialError;

    if (!credential) {
      return NextResponse.json({ status: 'disconnected', phoneNumber: null });
    }

    const state = await getInstanceState({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    const status = mapState(state);
    let phoneNumber: string | null = null;

    if (status === 'connected') {
      const wa = await getWaSettings({
        apiUrl: credential.api_url,
        idInstance: credential.id_instance,
        apiTokenInstance: credential.api_token_instance,
      });
      phoneNumber = wa.phone || null;
    }

    const { data: existingConnection } = await admin
      .from('whatsapp_connections')
      .select('connected_at, status')
      .eq('user_id', user.id)
      .maybeSingle();

    await admin
      .from('whatsapp_connections')
      .update({
        status,
        phone_number: phoneNumber,
        connected_at:
          status === 'connected'
            ? existingConnection?.connected_at ?? new Date().toISOString()
            : null,
        provider_state: state,
        last_checked_at: new Date().toISOString(),
        last_error: status === 'error' ? state : null,
      })
      .eq('user_id', user.id);

    if (
      status === 'connected' &&
      existingConnection?.status !== 'connected'
    ) {
      await wakeAutomationWorker();
    }

    return NextResponse.json({
      status,
      providerState: state,
      phoneNumber,
    });
  } catch (error) {
    const safe = safeUserApiError(error, 'לא הצלחנו לבדוק את מצב חיבור ה-WhatsApp.');
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
