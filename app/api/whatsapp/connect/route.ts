import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPartnerInstance } from '@/lib/green-api';

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

    const { data: existingCredential, error: credentialError } = await admin
      .from('green_api_credentials')
      .select('id_instance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credentialError) throw credentialError;

    if (existingCredential) {
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('status, phone_number, instance_id')
        .eq('user_id', user.id)
        .maybeSingle();

      return NextResponse.json({
        created: false,
        status: connection?.status ?? 'creating',
        phoneNumber: connection?.phone_number ?? null,
        instanceId: connection?.instance_id ?? existingCredential.id_instance,
      });
    }

    const instance = await createPartnerInstance(
      `whatsapp-plus-${user.id.slice(0, 8)}`,
    );

    const { error: saveCredentialError } = await admin
      .from('green_api_credentials')
      .insert({
        user_id: user.id,
        id_instance: instance.idInstance,
        api_token_instance: instance.apiTokenInstance,
        api_url: instance.apiUrl,
        media_url: instance.mediaUrl,
      });

    if (saveCredentialError) throw saveCredentialError;

    const { error: saveConnectionError } = await admin
      .from('whatsapp_connections')
      .upsert(
        {
          user_id: user.id,
          provider: 'green_api',
          instance_id: instance.idInstance,
          status: 'creating',
          last_error: null,
        },
        { onConflict: 'user_id' },
      );

    if (saveConnectionError) throw saveConnectionError;

    return NextResponse.json({
      created: true,
      status: 'creating',
      instanceId: instance.idInstance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
