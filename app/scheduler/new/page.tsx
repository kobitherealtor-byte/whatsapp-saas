'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MediaUpload from '@/components/MediaUpload';
import { createScheduledMessage } from '@/app/actions/messages';

export default function NewScheduledMessage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    recipient: '',
    name: '',
    body: '',
    date: '',
    time: '',
    recurrence: 'none',
    mediaUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.date || !formData.time) {
        throw new Error('תאריך או שעה אינם תקינים.');
      }

      await createScheduledMessage({
        recipient: formData.recipient,
        name: formData.name,
        body: formData.body,
        scheduledAt: `${formData.date}T${formData.time}`,
        recurrence: formData.recurrence,
        mediaUrl: formData.mediaUrl,
      });

      router.push('/scheduler');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'אירעה שגיאה בשמירה',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6">
          <Link href="/scheduler" className="text-sm font-bold text-emerald-700 hover:underline">← חזרה להודעות</Link>
          <h1 className="mt-3 text-3xl font-black">תזמון הודעה חדשה</h1>
          <p className="mt-1 text-slate-500">בחר יעד, כתוב הודעה וקבע מתי היא תישלח.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              מספר טלפון *
              <input
                type="tel"
                required
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder="0501234567"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                disabled={loading}
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              שם איש קשר
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="אופציונלי"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                disabled={loading}
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            תוכן ההודעה *
            <textarea
              rows={5}
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="רשום כאן את ההודעה..."
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
              disabled={loading}
            />
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
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                disabled={loading}
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              שעה *
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                disabled={loading}
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            חזרה
            <select
              value={formData.recurrence}
              onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-500"
              disabled={loading}
            >
              <option value="none">ללא חזרה</option>
              <option value="daily">כל יום</option>
              <option value="weekly">כל שבוע</option>
              <option value="monthly">כל חודש</option>
            </select>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'שומר...' : 'שמור ותזמן'}
            </button>
            <Link href="/scheduler" className="rounded-xl border border-slate-200 px-5 py-3 text-center font-bold text-slate-600 hover:bg-slate-50">ביטול</Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
