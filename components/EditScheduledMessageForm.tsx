'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateScheduledMessage } from '@/app/actions/messages';
import MediaUpload from '@/components/MediaUpload';

function localParts(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

export default function EditScheduledMessageForm({
  message,
}: {
  message: {
    id: string;
    recipient_number: string;
    recipient_name: string | null;
    message_body: string;
    scheduled_time: string;
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    media_url: string | null;
  };
}) {
  const router = useRouter();
  const initial = localParts(message.scheduled_time);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    recipient: message.recipient_number,
    name: message.recipient_name ?? '',
    body: message.message_body,
    date: initial.date,
    time: initial.time,
    recurrence: message.recurrence,
    mediaUrl: message.media_url ?? '',
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const localDate = new Date(`${formData.date}T${formData.time}`);
      if (Number.isNaN(localDate.getTime())) {
        throw new Error('תאריך או שעה אינם תקינים.');
      }

      await updateScheduledMessage(message.id, {
        recipient: formData.recipient,
        name: formData.name,
        body: formData.body,
        scheduledAt: localDate.toISOString(),
        recurrence: formData.recurrence,
        mediaUrl: formData.mediaUrl,
      });

      router.push('/scheduler');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'שמירת השינויים נכשלה.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          מספר טלפון *
          <input type="tel" required value={formData.recipient} onChange={(e) => setFormData({ ...formData, recipient: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          שם איש קשר
          <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
        </label>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        תוכן ההודעה *
        <textarea rows={5} required value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
      </label>

      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">מדיה</div>
        <MediaUpload
          value={formData.mediaUrl}
          onChange={(mediaUrl) => setFormData({ ...formData, mediaUrl })}
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          תאריך *
          <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          שעה *
          <input type="time" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
        </label>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        חזרה
        <select value={formData.recurrence} onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as typeof formData.recurrence })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">
          <option value="none">ללא חזרה</option>
          <option value="daily">כל יום</option>
          <option value="weekly">כל שבוע</option>
          <option value="monthly">כל חודש</option>
        </select>
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'שומר...' : 'שמור שינויים'}
        </button>
        <Link href="/scheduler" className="rounded-xl border border-slate-200 px-5 py-3 text-center font-bold text-slate-600 hover:bg-slate-50">ביטול</Link>
      </div>
    </form>
  );
}
