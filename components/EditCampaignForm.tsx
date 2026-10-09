'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateGroupCampaign } from '@/app/actions/campaigns';
import type { WhatsAppGroupRow } from '@/lib/data';

const days = [
  { label: 'א׳', value: 0 },
  { label: 'ב׳', value: 1 },
  { label: 'ג׳', value: 2 },
  { label: 'ד׳', value: 3 },
  { label: 'ה׳', value: 4 },
  { label: 'ו׳', value: 5 },
  { label: 'ש׳', value: 6 },
];

export default function EditCampaignForm({
  campaign,
  groups,
}: {
  campaign: {
    id: string;
    name: string;
    message_body: string;
    media_url: string | null;
    days_of_week: number[];
    send_time: string;
    start_date: string;
    end_date: string | null;
    skip_holidays: boolean;
    campaign_groups: Array<{ group_id: string }>;
  };
  groups: WhatsAppGroupRow[];
}) {
  const router = useRouter();
  const initialGroups = useMemo(
    () => campaign.campaign_groups.map((item) => item.group_id),
    [campaign.campaign_groups],
  );

  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialGroups);
  const [selectedDays, setSelectedDays] = useState<number[]>(campaign.days_of_week ?? []);
  const [name, setName] = useState(campaign.name);
  const [message, setMessage] = useState(campaign.message_body);
  const [mediaUrl, setMediaUrl] = useState(campaign.media_url ?? '');
  const [sendTime, setSendTime] = useState(campaign.send_time.slice(0, 5));
  const [startDate, setStartDate] = useState(campaign.start_date);
  const [endDate, setEndDate] = useState(campaign.end_date ?? '');
  const [skipHolidays, setSkipHolidays] = useState(campaign.skip_holidays);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleGroup = (id: string) => {
    setSelectedGroups((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleDay = (value: number) => {
    setSelectedDays((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await updateGroupCampaign(campaign.id, {
        name,
        message,
        mediaUrl,
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
    <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={submit}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <label className="block text-sm font-bold text-slate-700">
        שם הקמפיין
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        תוכן ההודעה
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        קישור למדיה
        <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://.../image.jpg" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" />
        <span className="mt-1 block text-xs font-normal text-slate-400">אופציונלי. העלאת קובץ ישירה תתווסף בשלב הבא.</span>
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-700">קבוצות לפרסום</div>
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelectedGroups(
                  selectedGroups.length === groups.length ? [] : groups.map((group) => group.id),
                )
              }
              className="text-xs font-bold text-emerald-700"
            >
              {selectedGroups.length === groups.length ? 'נקה הכל' : 'בחר הכל'}
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((group) => (
            <button type="button" key={group.id} onClick={() => toggleGroup(group.id)} className={`rounded-xl border px-4 py-3 text-right text-sm font-semibold ${selectedGroups.includes(group.id) ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              {selectedGroups.includes(group.id) ? '✓ ' : ''}{group.name}
            </button>
          ))}
        </div>
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
        <span>
          <span className="block text-sm font-bold">דלג על חגים</span>
          <span className="text-xs text-slate-500">Holiday Guard ימנע פרסום בחגים מוגדרים.</span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <button type="submit" disabled={loading || groups.length === 0} className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
          {loading ? 'שומר...' : 'שמור שינויים'}
        </button>
        <Link href="/publisher" className="rounded-xl border border-slate-200 px-5 py-3 text-center font-bold text-slate-600 hover:bg-slate-50">ביטול</Link>
      </div>
    </form>
  );
}
