'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createScheduledMessage(formData: {
  recipient: string;
  name: string;
  body: string;
  date: string;
  time: string;
  recurrence: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('צריך להתחבר למערכת לפני שמירת הודעה.');
  }

  const recipient = formData.recipient.replace(/[^0-9+]/g, '');
  if (recipient.length < 9) throw new Error('מספר הטלפון אינו תקין.');
  if (!formData.body.trim()) throw new Error('תוכן ההודעה חסר.');

  const scheduledTime = new Date(`${formData.date}T${formData.time}`);
  if (Number.isNaN(scheduledTime.getTime())) throw new Error('תאריך או שעה אינם תקינים.');
  if (scheduledTime.getTime() <= Date.now()) throw new Error('זמן השליחה חייב להיות בעתיד.');

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
}
