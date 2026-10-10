import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getChats } from '@/lib/green-api';
import { assertUserRateLimit } from '@/lib/rate-limit';
import { safeUserApiError } from '@/lib/api-error';
import { assertFeatureEnabled } from '@/lib/features';

export async function GET() {
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
      bucket: 'inbox-chats',
      limit: 20,
      windowSeconds: 60,
    });

    const admin = createAdminClient();
    const { data: credential, error } = await admin
      .from('green_api_credentials')
      .select('id_instance, api_token_instance, api_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!credential) throw new Error('no_instance');

    const chats = await getChats({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    return NextResponse.json({
      chats: chats
        .filter((chat) => chat.id)
        .map((chat) => ({
          id: chat.id!,
          name: chat.name || chat.id!,
          archive: Boolean(chat.archive),
          type: chat.type || (chat.id?.endsWith('@g.us') ? 'group' : 'user'),
          unreadCount: Number(chat.unreadCount ?? 0),
        })),
    });
  } catch (error) {
    const safe = safeUserApiError(error, 'לא הצלחנו לטעון את רשימת השיחות כרגע.');
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
