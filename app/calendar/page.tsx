'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';

const seedEvents = [
  { id: '1', title: 'הודעה ליוסי כהן', day: 8, type: 'scheduler', time: '15:30' },
  { id: '2', title: 'מבצע סוף שבוע', day: 8, type: 'publisher', time: '17:00' },
  { id: '3', title: 'הודעה למיכל לוי', day: 12, type: 'scheduler', time: '10:00' },
  { id: '4', title: 'עדכון שבועי', day: 15, type: 'publisher', time: '09:00' },
  { id: '5', title: 'ברכת שבת שלום', day: 23, type: 'publisher', time: '14:00' },
];

export default function CalendarPage() {
  const [selected, setSelected] = useState<(typeof seedEvents)[number] | null>(null);
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const blanks = Array.from({ length: 4 }, (_, i) => i);
  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-black">יומן תזמונים</h1><p className="mt-1 text-slate-500">מבט אחד על הודעות אישיות וקמפיינים לקבוצות.</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">אוקטובר 2026</div></header>
        <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold text-slate-600"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-500" /> הודעה אישית</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-blue-500" /> פרסום לקבוצות</span></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold text-slate-500">{daysOfWeek.map((day) => <div key={day} className="p-3">{day}</div>)}</div>
            <div className="grid grid-cols-7">{blanks.map((blank) => <div key={`blank-${blank}`} className="min-h-28 border-b border-l border-slate-100 bg-slate-50/50" />)}{daysInMonth.map((day) => {
              const dayEvents = seedEvents.filter((event) => event.day === day);
              const isToday = day === 8;
              return <div key={day} className={`min-h-28 border-b border-l border-slate-100 p-2 ${isToday ? 'bg-emerald-50/40' : 'bg-white'}`}><div className="mb-2 flex items-center justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>{day}</span>{isToday && <span className="text-[10px] font-bold text-emerald-700">היום</span>}</div><div className="space-y-1">{dayEvents.map((event) => <button key={event.id} onClick={() => setSelected(event)} className={`block w-full truncate rounded-lg px-2 py-1.5 text-right text-[11px] font-bold ${event.type === 'scheduler' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}><span className="ml-1 font-mono">{event.time}</span>{event.title}</button>)}</div></div>;
            })}</div>
          </div>
        </div>
        {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" onClick={() => setSelected(null)}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="text-xs font-bold text-slate-400">{selected.type === 'scheduler' ? 'הודעה אישית' : 'קמפיין קבוצות'}</div><h2 className="mt-1 text-xl font-black">{selected.title}</h2><p className="mt-2 text-sm text-slate-500">מתוזמן ליום {selected.day}/10 בשעה {selected.time}</p><div className="mt-6 grid grid-cols-3 gap-2"><button className="rounded-xl border border-slate-200 py-2 text-sm font-bold">ערוך</button><button className="rounded-xl border border-slate-200 py-2 text-sm font-bold">דחה</button><button className="rounded-xl bg-slate-900 py-2 text-sm font-bold text-white">שלח עכשיו</button></div></div></div>}
      </div>
    </AppShell>
  );
}