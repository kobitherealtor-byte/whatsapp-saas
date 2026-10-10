import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGreenApiFileByUrl, sendGreenApiText } from '@/lib/green-api';
import { assertUserRateLimit } from '@/lib/rate-limit';
import { safeUserApiError } from '@/lib/api-error';
import { assertFeatureEnabled } from '@/lib/features';
import { assertAccountOperational } from '@/lib/account-limits';
import { writeAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'צריך להתחבר מחדש למערכת.' }, { status: 401 });
    }

    await assertFeatureEnabled(user.id, 'inbox');

    await assertAccountOperational(user.id);
    await assertUserRateLimit({
      userId: user.id,
      bucket: 'inbox-send',
      limit: 30,
      windowSeconds: 60,
    });

    const body = (await request.json()) as {
      chatId?: string;
      message?: string;
      mediaUrl?: string | null;
    };

    const chatId = body.chatId?.trim();
    const message = body.message?.trim() || '';
    const mediaUrl = body.mediaUrl?.trim() || null;

    if (!chatId || chatId.length > 120) {
      return NextResponse.json({ error: 'שיחה לא תקינה.' }, { status: 400 });
    }
    if (!message && !mediaUrl) {
      return NextResponse.json({ error: 'צריך לכתוב הודעה או לצרף קובץ.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: credential, error } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!credential) throw new Error('no_instance');

    const connection = {
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
      chatId,
    };

    const externalMessageId = mediaUrl
      ? await sendGreenApiFileByUrl({
          ...connection,
          urlFile: mediaUrl,
          caption: message || undefined,
        })
      : await sendGreenApiText({
          ...connection,
          message,
        });

    await admin.from('send_logs').insert({
      user_id: user.id,
      entity_type: 'inbox',
      entity_id: user.id,
      recipient_id: chatId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      kind: 'inbox',
      ref_id: user.id,
      destination: chatId,
      detail: message,
      external_message_id: externalMessageId,
      created_at: new Date().toISOString(),
    });

    await writeAuditEvent({
      userId: user.id,
      eventType: 'inbox.message.sent',
      entityType: 'inbox',
      entityId: user.id,
      metadata: { chatId, hasMedia: Boolean(mediaUrl) },
    });

    return NextResponse.json({ ok: true, externalMessageId });
  } catch (error) {
    const safe = safeUserApiError(error, 'שליחת ההודעה נכשלה.');
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
