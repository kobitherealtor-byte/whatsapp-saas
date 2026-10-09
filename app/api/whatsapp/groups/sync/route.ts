import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getChats } from '@/lib/green-api';
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
      bucket: 'whatsapp-groups-sync',
      limit: 6,
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
      return NextResponse.json({ error: 'no_instance' }, { status: 404 });
    }

    const chats = await getChats({
      apiUrl: credential.api_url,
      idInstance: credential.id_instance,
      apiTokenInstance: credential.api_token_instance,
    });

    const groups = chats
      .filter((chat) => chat.id?.endsWith('@g.us'))
      .slice(0, 500)
      .map((chat) => ({
        user_id: user.id,
        chat_id: chat.id!,
        group_chat_id: chat.id!,
        name: chat.name?.trim() || chat.id!,
        group_name: chat.name?.trim() || chat.id!,
        is_active: true,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (groups.length > 0) {
      const { error: upsertError } = await admin
        .from('whatsapp_groups')
        .upsert(groups, { onConflict: 'user_id,chat_id' });

      if (upsertError) throw upsertError;
    }

    const activeChatIds = groups.map((group) => group.chat_id);

    const { data: storedGroups, error: storedGroupsError } = await admin
      .from('whatsapp_groups')
      .select('id, chat_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (storedGroupsError) throw storedGroupsError;

    const staleIds = (storedGroups ?? [])
      .filter((group) => !activeChatIds.includes(group.chat_id))
      .map((group) => group.id);

    if (staleIds.length > 0) {
      const { error: deactivateError } = await admin
        .from('whatsapp_groups')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', staleIds);

      if (deactivateError) throw deactivateError;
    }

    return NextResponse.json({
      synced: groups.length,
      groups: groups.map((group) => ({
        chatId: group.chat_id,
        name: group.name,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'rate_limited' ? 429 : 500;
    return NextResponse.json(
      { error: message === 'rate_limited' ? 'יותר מדי בקשות. נסה שוב בעוד רגע.' : message },
      { status },
    );
  }
}
