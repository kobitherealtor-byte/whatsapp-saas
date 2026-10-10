import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getChatHistory } from '@/lib/green-api';
import { assertUserRateLimit } from '@/lib/rate-limit';
import { safeUserApiError } from '@/lib/api-error';
import { assertFeatureEnabled } from '@/lib/features';

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

    await assertUserRateLimit({
      userId: user.id,
      bucket: 'inbox-history',
      limit: 30,
      windowSeconds: 60,
    });

    const body = (await request.json()) as { chatId?: string; count?: number };
    const chatId = body.chatId?.trim();

    if (
      !chatId ||
      chatId.length > 120 ||
      !/^[0-9A-Za-z._-]+@(c\.us|g\.us)$/.test(chatId)
    ) {
      return NextResponse.json({ error: 'שיחה לא תקינה.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: credential, error } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!credential) throw new Error('no_instance');

    const history = await getChatHistory({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
      chatId,
      count: body.count ?? 50,
    });

    const messages = history
      .map((item) => ({
        id: item.idMessage || crypto.randomUUID(),
        timestamp: Number(item.timestamp ?? 0),
        type: item.type || item.typeMessage || 'unknown',
        senderId: item.senderId || null,
        senderName: item.senderName || null,
        text:
          item.textMessage ||
          item.extendedTextMessage?.text ||
          item.caption ||
          '',
        downloadUrl: item.downloadUrl || null,
        status: item.statusMessage || null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({ messages });
  } catch (error) {
    const safe = safeUserApiError(error, 'לא הצלחנו לטעון את היסטוריית השיחה כרגע.');
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
