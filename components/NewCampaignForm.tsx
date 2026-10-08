'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroupCampaign } from '@/app/actions/campaigns';
import type { WhatsAppGroupRow } from '@/lib/data';

const days = [
  { label: 'א׳', value: 0 },
  { label: 'ב׳', value: 1 },
  { label: 'ג׳', value: 2 },
  { label: 'ד׳', value: 3 },
  { label: 'ה׳', value: 4 },
  { label: 'ו׳', value: 5 },
];

export default function NewCampaignForm({ groups }: { groups: WhatsAppGroupRow[] }) {
  const router = useRouter();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleGroup = (id: string) => {
    setSelectedGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleDay = (value: number) => {
    setSelectedDays((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createGroupCampaign({
        name,
        message,
        groupIds: selectedGroups,
        daysOfWeek: selectedDays,
        sendTime,
        startDate,
        endDate,
        skipHolidays,
      });
      router.push('/publisher');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'אירעה שגיאה בשמירת הקמפיין.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={submit}>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      <label className="block text-sm font-bold text-slate-700">
        שם הקמפיין
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="לדוגמה: מבצע סוף שבוע" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        תוכן ההודעה
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="הטקסט שיישלח לכל הקבוצות..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
      </label>

      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">קבוצות לפרסום</div>
        {groups.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => (
              <button type="button" key={group.id} onClick={() => toggleGroup(group.id)} className={`rounded-xl border px-4 py-3 text-right text-sm font-semibold ${selectedGroups.includes(group.id) ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'}`}>
                {selectedGroups.includes(group.id) ? '✓ ' : ''}{group.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            עדיין אין קבוצות מסונכרנות. אחרי שנחבר GREEN API הן יופיעו כאן אוטומטית.
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">ימי פרסום</div>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button type="button" key={day.value} onClick={() => toggleDay(day.value)} className={`h-11 w-11 rounded-xl font-bold ${selectedDays.includes(day.value) ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">שעה<input value={sendTime} onChange={(e) => setSendTime(e.target.value)} required type="time" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold text-slate-700">התחלה<input value={startDate} onChange={(e) => setStartDate(e.target.value)} required type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-bold text-slate-700">סיום<input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input type="checkbox" checked={skipHolidays} onChange={(e) => setSkipHolidays(e.target.checked)} className="h-4 w-4" />
        <span><span className="block text-sm font-bold">דלג על חגים</span><span className="text-xs text-slate-500">Holiday Guard ימנע פרסום במועדים שיוגדרו כחג.</span></span>
      </label>

      <button type="submit" disabled={loading || groups.length === 0} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? 'שומר...' : 'שמור והפעל קמפיין'}
      </button>
    </form>
  );
}
