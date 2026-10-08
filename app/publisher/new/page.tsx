'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

const groups = ['דירות למכירה באהבה בהרצליה', 'דירות להשכרה ומכירה קהילת וייצמן', 'הרצליה הירוקה – עדכונים', 'לקוחות VIP'];
const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];

export default function NewCampaignPage() {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6"><Link href="/publisher" className="text-sm font-bold text-emerald-700 hover:underline">← חזרה לקמפיינים</Link><h1 className="mt-3 text-3xl font-black">קמפיין קבוצות חדש</h1><p className="mt-1 text-slate-500">בוחרים קבוצות, תוכן ותזמון קבוע. פשוט וברור.</p></div>
        <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm font-bold text-slate-700">שם הקמפיין<input placeholder="לדוגמה: מבצע סוף שבוע" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" /></label>
          <label className="block text-sm font-bold text-slate-700">תוכן ההודעה<textarea rows={5} placeholder="הטקסט שיישלח לכל הקבוצות..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" /></label>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-700">קבוצות לפרסום</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => <button type="button" key={group} onClick={() => toggle(group, selectedGroups, setSelectedGroups)} className={`rounded-xl border px-4 py-3 text-right text-sm font-semibold ${selectedGroups.includes(group) ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'}`}>{selectedGroups.includes(group) ? '✓ ' : ''}{group}</button>)}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-700">ימי פרסום</div>
            <div className="flex flex-wrap gap-2">{days.map((day) => <button type="button" key={day} onClick={() => toggle(day, selectedDays, setSelectedDays)} className={`h-11 w-11 rounded-xl font-bold ${selectedDays.includes(day) ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{day}</button>)}</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold text-slate-700">שעה<input type="time" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-bold text-slate-700">התחלה<input type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-bold text-slate-700">סיום<input type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label></div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" defaultChecked className="h-4 w-4" /><span><span className="block text-sm font-bold">דלג על חגים</span><span className="text-xs text-slate-500">Holiday Guard ימנע פרסום במועדים שהוגדרו כחג.</span></span></label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row"><button type="submit" className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800">שמור והפעל קמפיין</button><Link href="/publisher" className="rounded-xl border border-slate-200 px-5 py-3 text-center font-bold text-slate-600 hover:bg-slate-50">ביטול</Link></div>
        </form>
      </div>
    </AppShell>
  );
}