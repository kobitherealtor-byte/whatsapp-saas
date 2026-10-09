'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { wakeAutomationWorker } from '@/lib/automation-wake';
import { assertAccountOperational, assertCanCreatePendingMessage } from '@/lib/account-limits';
import { writeAuditEvent } from '@/lib/audit';
import { parseIsraelLocalDateTimeInput } from '@/lib/timezone';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('צריך להתחבר למערכת.');
  }

  return { supabase, user };
}

export async function createScheduledMessage(formData: {
  recipient: string;
  name: string;
  body: string;
  scheduledAt: string;
  recurrence: string;
  mediaUrl?: string;
}) {
  const { supabase, user } = await requireUser();
  await assertAccountOperational(user.id);
  await assertCanCreatePendingMessage(user.id);

  const recipient = formData.recipient.replace(/[^0-9+]/g, '');
  if (recipient.length < 9) throw new Error('מספר הטלפון אינו תקין.');
  if (!formData.body.trim()) throw new Error('תוכן ההודעה חסר.');

  const scheduledTime = parseIsraelLocalDateTimeInput(formData.scheduledAt);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw new Error('תאריך או שעה אינם תקינים.');
  }
  if (scheduledTime.getTime() <= Date.now()) {
    throw new Error('זמן השליחה חייב להיות בעתיד.');
  }

  const allowedRecurrence = new Set(['none', 'daily', 'weekly', 'monthly']);
  if (!allowedRecurrence.has(formData.recurrence)) {
    throw new Error('סוג החזרה אינו תקין.');
  }

  const { data: createdMessage, error } = await supabase.from('scheduled_messages').insert({
    user_id: user.id,
    recipient_number: recipient,
    recipient_name: formData.name.trim() || null,
    message_body: formData.body.trim(),
    media_url: formData.mediaUrl?.trim() || null,
    scheduled_time: scheduledTime.toISOString(),
    timezone: 'Asia/Jerusalem',
    recurrence: formData.recurrence,
    status: 'pending',
  }).select('id').single();

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.created',
    entityType: 'scheduled_message',
    entityId: createdMessage.id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}

export async function cancelScheduledMessage(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('scheduled_messages')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.cancelled',
    entityType: 'scheduled_message',
    entityId: id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}

export async function duplicateScheduledMessage(id: string) {
  const { supabase, user } = await requireUser();
  await assertAccountOperational(user.id);
  await assertCanCreatePendingMessage(user.id);

  const { data: source, error: sourceError } = await supabase
    .from('scheduled_messages')
    .select('recipient_number, recipient_name, message_body, recurrence, media_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (sourceError || !source) {
    throw new Error('ההודעה המקורית לא נמצאה.');
  }

  const nextHour = new Date(Date.now() + 60 * 60 * 1000);

  const { data: duplicatedMessage, error } = await supabase.from('scheduled_messages').insert({
    user_id: user.id,
    recipient_number: source.recipient_number,
    recipient_name: source.recipient_name,
    message_body: source.message_body,
    media_url: source.media_url ?? null,
    scheduled_time: nextHour.toISOString(),
    timezone: 'Asia/Jerusalem',
    recurrence: source.recurrence,
    status: 'pending',
  }).select('id').single();

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.duplicated',
    entityType: 'scheduled_message',
    entityId: duplicatedMessage.id,
    metadata: { sourceId: id },
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}


export async function updateScheduledMessage(
  id: string,
  formData: {
    recipient: string;
    name: string;
    body: string;
    scheduledAt: string;
    recurrence: string;
    mediaUrl?: string;
  },
) {
  const { supabase, user } = await requireUser();

  const recipient = formData.recipient.replace(/[^0-9+]/g, '');
  if (recipient.length < 9) throw new Error('מספר הטלפון אינו תקין.');
  if (!formData.body.trim()) throw new Error('תוכן ההודעה חסר.');

  const scheduledTime = parseIsraelLocalDateTimeInput(formData.scheduledAt);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw new Error('תאריך או שעה אינם תקינים.');
  }
  if (scheduledTime.getTime() <= Date.now()) {
    throw new Error('זמן השליחה חייב להיות בעתיד.');
  }

  const allowedRecurrence = new Set(['none', 'daily', 'weekly', 'monthly']);
  if (!allowedRecurrence.has(formData.recurrence)) {
    throw new Error('סוג החזרה אינו תקין.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('scheduled_messages')
    .select('status, recipient_number, recipient_name, message_body, media_url, recurrence')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (existingError || !existing) {
    throw new Error('ההודעה לא נמצאה.');
  }

  if (existing.status !== 'pending') {
    throw new Error('אפשר לערוך רק הודעה שממתינה לשליחה.');
  }

  const { error } = await supabase
    .from('scheduled_messages')
    .update({
      recipient_number: recipient,
      recipient_name: formData.name.trim() || null,
      message_body: formData.body.trim(),
      media_url: formData.mediaUrl?.trim() || null,
      scheduled_time: scheduledTime.toISOString(),
      timezone: 'Asia/Jerusalem',
      recurrence: formData.recurrence,
      retry_count: 0,
      error_text: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.updated',
    entityType: 'scheduled_message',
    entityId: id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}


export async function retryScheduledMessage(id: string) {
  const { supabase, user } = await requireUser();
  await assertAccountOperational(user.id);
  await assertCanCreatePendingMessage(user.id);

  const { data: message, error: messageError } = await supabase
    .from('scheduled_messages')
    .select('status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (messageError || !message) throw new Error('ההודעה לא נמצאה.');
  if (message.status !== 'failed') {
    throw new Error('אפשר לנסות שוב רק הודעה שנכשלה.');
  }

  const { error } = await supabase
    .from('scheduled_messages')
    .update({
      status: 'pending',
      retry_count: 0,
      error_text: null,
      claim_token: null,
      claimed_at: null,
      scheduled_time: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'failed');

  if (error) throw new Error(error.message);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.retry_requested',
    entityType: 'scheduled_message',
    entityId: id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  revalidatePath('/history');
  await wakeAutomationWorker();
}


export async function sendScheduledMessageNow(id: string) {
  const { supabase, user } = await requireUser();
  await assertAccountOperational(user.id);

  const { data: message, error: messageError } = await supabase
    .from('scheduled_messages')
    .select('status, recipient_number, recipient_name, message_body, media_url, recurrence')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (messageError || !message) throw new Error('ההודעה לא נמצאה.');
  if (message.status !== 'pending') {
    throw new Error('אפשר לשלוח עכשיו רק הודעה שממתינה.');
  }

  const sendAt = new Date(Date.now() + 15_000).toISOString();
  let sendNowEntityId = id;

  if (message.recurrence !== 'none') {
    await assertCanCreatePendingMessage(user.id);

    const { data: immediateCopy, error } = await supabase
      .from('scheduled_messages')
      .insert({
        user_id: user.id,
        recipient_number: message.recipient_number,
        recipient_name: message.recipient_name,
        message_body: message.message_body,
        media_url: message.media_url ?? null,
        scheduled_time: sendAt,
        timezone: 'Asia/Jerusalem',
        recurrence: 'none',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    sendNowEntityId = immediateCopy.id;
  } else {
    const { error } = await supabase
      .from('scheduled_messages')
      .update({
        scheduled_time: sendAt,
        retry_count: 0,
        error_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
  }

  await writeAuditEvent({
    userId: user.id,
    eventType: 'scheduled_message.send_now_requested',
    entityType: 'scheduled_message',
    entityId: sendNowEntityId,
    metadata:
      message.recurrence !== 'none'
        ? { sourceRecurringMessageId: id }
        : undefined,
  });

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}
