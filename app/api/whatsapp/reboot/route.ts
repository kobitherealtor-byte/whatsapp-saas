import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rebootGreenApiInstance } from '@/lib/green-api';
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
      bucket: 'whatsapp-reboot',
      limit: 2,
      windowSeconds: 10 * 60,
    });

    const admin = createAdminClient();
    const { data: credential, error } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!credential) {
      return NextResponse.json({ error: 'no_instance' }, { status: 404 });
    }

    await rebootGreenApiInstance({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    await admin
      .from('whatsapp_connections')
      .update({
        status: 'creating',
        provider_state: 'starting',
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true, status: 'creating' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status =
      message === 'unauthorized' ? 401 : message === 'rate_limited' ? 429 : 500;
    return NextResponse.json(
      { error: message === 'rate_limited' ? 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.' : message },
      { status },
    );
  }
}
