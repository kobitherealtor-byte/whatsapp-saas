'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { wakeAutomationWorker } from '@/lib/automation-wake';

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
}) {
  const { supabase, user } = await requireUser();

  const recipient = formData.recipient.replace(/[^0-9+]/g, '');
  if (recipient.length < 9) throw new Error('מספר הטלפון אינו תקין.');
  if (!formData.body.trim()) throw new Error('תוכן ההודעה חסר.');

  const scheduledTime = new Date(formData.scheduledAt);
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

  const { error } = await supabase.from('scheduled_messages').insert({
    user_id: user.id,
    recipient_number: recipient,
    recipient_name: formData.name.trim() || null,
    message_body: formData.body.trim(),
    scheduled_time: scheduledTime.toISOString(),
    timezone: 'Asia/Jerusalem',
    recurrence: formData.recurrence,
    status: 'pending',
  });

  if (error) throw new Error(error.message);

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

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}

export async function duplicateScheduledMessage(id: string) {
  const { supabase, user } = await requireUser();

  const { data: source, error: sourceError } = await supabase
    .from('scheduled_messages')
    .select('recipient_number, recipient_name, message_body, recurrence')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (sourceError || !source) {
    throw new Error('ההודעה המקורית לא נמצאה.');
  }

  const nextHour = new Date(Date.now() + 60 * 60 * 1000);

  const { error } = await supabase.from('scheduled_messages').insert({
    user_id: user.id,
    recipient_number: source.recipient_number,
    recipient_name: source.recipient_name,
    message_body: source.message_body,
    scheduled_time: nextHour.toISOString(),
    timezone: 'Asia/Jerusalem',
    recurrence: source.recurrence,
    status: 'pending',
  });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}
