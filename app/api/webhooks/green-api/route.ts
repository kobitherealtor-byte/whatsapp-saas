import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type GreenWebhook = {
  typeWebhook?: string;
  instanceData?: {
    idInstance?: number | string;
    wid?: string;
    typeInstance?: string;
  };
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    chatName?: string;
    sender?: string;
    senderName?: string;
    senderContactName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
    fileMessageData?: { downloadUrl?: string; caption?: string };
    downloadUrl?: string;
    caption?: string;
    [key: string]: unknown;
  };
  status?: string;
  statusMessage?: string;
  stateInstance?: string;
  statusInstance?: string;
  [key: string]: unknown;
};

function unauthorized() {
  return NextResponse.json({ ok: false }, { status: 401 });
}

function extractText(data: GreenWebhook['messageData']) {
  if (!data) return '';

  const fileData = data.fileMessageData as
    | { caption?: string; downloadUrl?: string }
    | undefined;

  return (
    data.textMessageData?.textMessage ||
    data.extendedTextMessageData?.text ||
    fileData?.caption ||
    (typeof data.caption === 'string' ? data.caption : '') ||
    ''
  );
}

function extractMediaUrl(data: GreenWebhook['messageData']) {
  if (!data) return null;

  const fileData = data.fileMessageData as
    | { downloadUrl?: string }
    | undefined;

  const value =
    fileData?.downloadUrl ||
    (typeof data.downloadUrl === 'string' ? data.downloadUrl : null);

  return value || null;
}

function connectionState(body: GreenWebhook) {
  const state = body.stateInstance || body.statusInstance || null;
  if (!state) return null;

  const normalized = state.toLowerCase();

  if (
    normalized === 'authorized' ||
    normalized === 'online' ||
    normalized === 'connected'
  ) {
    return { status: 'connected', state };
  }

  if (
    normalized === 'notauthorized' ||
    normalized === 'offline' ||
    normalized === 'disconnected'
  ) {
    return { status: 'disconnected', state };
  }

  if (normalized === 'blocked' || normalized === 'error') {
    return { status: 'error', state };
  }

  return { status: null, state };
}

export async function POST(request: Request) {
  const expectedToken = process.env.GREEN_API_WEBHOOK_TOKEN?.trim();
  const authorization = request.headers.get('authorization')?.trim();

  if (!expectedToken || authorization !== 'Bearer ' + expectedToken) {
    return unauthorized();
  }

  let body: GreenWebhook;

  try {
    body = (await request.json()) as GreenWebhook;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const idInstance = body.instanceData?.idInstance;
  if (!idInstance) {
    return NextResponse.json({ ok: false, error: 'missing_instance' }, { status: 400 });
  }

  const instanceId = String(idInstance);
  const admin = createAdminClient();

  const { data: credential, error: credentialError } = await admin
    .from('green_api_credentials')
    .select('user_id')
    .eq('id_instance', instanceId)
    .maybeSingle();

  if (credentialError) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!credential) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const userId = credential.user_id;
  const typeWebhook = body.typeWebhook || 'unknown';
  const now = new Date().toISOString();

  if (
    typeWebhook === 'stateInstanceChanged' ||
    typeWebhook === 'statusInstanceChanged'
  ) {
    const mapped = connectionState(body);

    if (mapped) {
      const update: Record<string, unknown> = {
        provider_state: mapped.state,
        last_checked_at: now,
        updated_at: now,
      };

      if (mapped.status) update.status = mapped.status;

      if (mapped.status === 'connected') {
        update.connected_at = now;
        update.last_error = null;
      }

      const { error } = await admin
        .from('whatsapp_connections')
        .update(update)
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (typeWebhook === 'outgoingMessageStatus') {
    if (body.idMessage) {
      const { error } = await admin
        .from('inbox_messages')
        .update({
          status_message: body.status || body.statusMessage || null,
          updated_at: now,
        })
        .eq('instance_id', instanceId)
        .eq('id_message', body.idMessage)
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  const isIncoming = typeWebhook === 'incomingMessageReceived';
  const isOutgoing =
    typeWebhook === 'outgoingMessageReceived' ||
    typeWebhook === 'outgoingAPIMessageReceived';

  if (!isIncoming && !isOutgoing) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!body.idMessage) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const eventTimestamp =
    typeof body.timestamp === 'number' && body.timestamp > 0
      ? new Date(body.timestamp * 1000).toISOString()
      : now;

  const row = {
    user_id: userId,
    instance_id: instanceId,
    id_message: body.idMessage,
    type_webhook: typeWebhook,
    direction: isIncoming ? 'incoming' : 'outgoing',
    chat_id: body.senderData?.chatId ?? null,
    chat_name: body.senderData?.chatName ?? null,
    sender_id: body.senderData?.sender ?? null,
    sender_name:
      body.senderData?.senderContactName ||
      body.senderData?.senderName ||
      null,
    message_type: body.messageData?.typeMessage ?? null,
    text_body: extractText(body.messageData),
    media_url: extractMediaUrl(body.messageData),
    status_message: body.status || body.statusMessage || null,
    event_timestamp: eventTimestamp,
    raw_payload: body,
    updated_at: now,
  };

  const { error: insertError } = await admin
    .from('inbox_messages')
    .upsert(row, {
      onConflict: 'instance_id,id_message,type_webhook',
    });

  if (insertError) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
