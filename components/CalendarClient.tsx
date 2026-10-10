'use client';

import { useMemo, useState } from 'react';
import type { CalendarEvent } from '@/lib/data';

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function eventLocalParts(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    time: `${map.hour}:${map.minute}`,
  };
}

function todayIsrael() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
  };
}

export default function CalendarClient({ events }: { events: CalendarEvent[] }) {
  const today = todayIsrael();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthLabel = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(Date.UTC(year, month, 15, 12)));

  const eventsByDay = useMemo(() => {
    const map = new Map<number, Array<CalendarEvent & { time: string }>>();

    for (const event of events) {
      const local = eventLocalParts(event.startsAt);
      if (local.year !== year || local.month !== month) continue;

      const list = map.get(local.day) ?? [];
      list.push({ ...event, time: local.time });
      map.set(local.day, list);
    }

    return map;
  }, [events, month, year]);

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black">יומן תזמונים</h1>
          <p className="mt-1 text-slate-500">הודעות אישיות, פרסום לקבוצות וקמפייני תפוצה במקום אחד.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50">‹</button>
          <div className="min-w-40 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-bold">{monthLabel}</div>
          <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50">›</button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-500" /> הודעה אישית</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-blue-500" /> פרסום לקבוצות</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-violet-500" /> קמפיין תפוצה</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold text-slate-500">
            {dayNames.map((day) => <div key={day} className="p-3">{day}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <div key={`blank-${index}`} className="min-h-28 border-b border-l border-slate-100 bg-slate-50/50" />
            ))}

            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
              const dayEvents = eventsByDay.get(day) ?? [];
              const isToday = today.year === year && today.month === month && today.day === day;

              return (
                <div key={day} className={`min-h-28 border-b border-l border-slate-100 p-2 ${isToday ? 'bg-emerald-50/40' : 'bg-white'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>{day}</span>
                    {isToday && <span className="text-[10px] font-bold text-emerald-700">היום</span>}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 4).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelected(event)}
                        className={`block w-full truncate rounded-lg px-2 py-1.5 text-right text-[11px] font-bold ${event.type === 'scheduler' ? 'bg-emerald-50 text-emerald-800' : event.type === 'broadcast' ? 'bg-violet-50 text-violet-800' : 'bg-blue-50 text-blue-800'}`}
                      >
                        <span className="ml-1 font-mono">{event.time}</span>
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 4 && (
                      <div className="px-2 text-[10px] font-bold text-slate-400">+{dayEvents.length - 4} נוספים</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-bold text-slate-400">{selected.type === 'scheduler' ? 'הודעה אישית' : selected.type === 'broadcast' ? 'קמפיין תפוצה' : 'קמפיין קבוצות'}</div>
            <h2 className="mt-1 text-xl font-black">{selected.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.detail}</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <div>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(selected.startsAt))}</div>
              <div className="mt-1 text-xs font-bold text-slate-400">סטטוס: {selected.status}</div>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white">סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}
