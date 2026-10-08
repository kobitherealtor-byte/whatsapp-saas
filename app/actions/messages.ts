'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// פונקציה אמיתית לשמירת הודעה מתוזמנת בבסיס הנתונים
export async function createScheduledMessage(formData: {
  recipient: string;
  name: string;
  body: string;
  date: string;
  time: string;
  recurrence: string;
}) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  // 1. שליפת המשתמש המחובר כרגע
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('משתמש לא מחובר');

  // 2. שילוב תאריך ושעה לפורמט הזמן של בסיס הנתונים
  const scheduledTime = new Date(`${formData.date}T${formData.time}`).toISOString();

  // 3. הכנסה לטבלה שהקמנו (Supabase RLS יוודא שזה נשמר בבטחה תחת ה-User ID שלו)
  const { error } = await supabase.from('scheduled_messages').insert({
    user_id: user.id,
    recipient_number: formData.recipient,
    recipient_name: formData.name,
    message_body: formData.body,
    scheduled_time: scheduledTime,
    recurrence: formData.recurrence,
    status: 'pending'
  });

  if (error) throw new Error(error.message);

  // רענון הדפים כדי שהנתון החדש יופיע מיד
  revalidatePath('/dashboard');
  revalidatePath('/scheduler');
}
