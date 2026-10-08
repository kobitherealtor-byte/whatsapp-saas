import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQrCode } from '@/lib/green-api';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

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

    const qr = await getQrCode({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    return NextResponse.json(qr);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
