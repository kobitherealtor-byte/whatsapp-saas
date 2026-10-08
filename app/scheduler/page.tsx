'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { scheduledMessages, type MessageStatus } from '@/lib/mock-data';

const statusMap: Record<MessageStatus, { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  sent: { label: 'נשלח', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  failed: { label: 'נכשל', className: 'bg-red-50 text-red-800 ring-red-200' },
  cancelled: { label: 'בוטל', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export default function SchedulerList() {
  const [filter, setFilter] = useState<'all' | MessageStatus>('all');
  const [query, setQuery] = useState('');

  const filteredMessages = useMemo(() => scheduledMessages.filter((msg) => {
    const matchesFilter = filter === 'all' || msg.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${msg.name} ${msg.phone} ${msg.body}`.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  }), [filter, query]);

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">הודעות מתוזמנות</h1>
            <p className="mt-1 text-slate-500">הודעות אישיות שנשלחות אוטומטית בזמן שבחרת.</p>
          </div>
          <Link href="/scheduler/new" className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700">+ תזמן הודעה</Link>
        </header>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חפש לפי שם, מספר או תוכן..." className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'הכל'],
              ['pending', 'ממתין'],
              ['sent', 'נשלח'],
              ['failed', 'נכשל'],
              ['cancelled', 'בוטל'],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_2fr_1fr_.7fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
            <div>יעד</div><div>הודעה</div><div>זמן</div><div>סטטוס</div><div>פעולות</div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="grid gap-3 p-5 md:grid-cols-[1.2fr_2fr_1fr_.7fr_.8fr] md:items-center">
                <div><div className="font-bold">{msg.name || 'ללא שם'}</div><div className="text-xs text-slate-400">{msg.phone}</div></div>
                <div className="text-sm text-slate-600">{msg.body}</div>
                <div className="text-sm font-medium text-slate-600">{msg.time}</div>
                <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusMap[msg.status].className}`}>{statusMap[msg.status].label}</span></div>
                <div className="flex gap-3 text-xs font-bold"><button className="text-slate-500 hover:text-slate-900">שכפול</button>{msg.status === 'pending' && <button className="text-red-600 hover:text-red-800">ביטול</button>}</div>
              </div>
            ))}
            {filteredMessages.length === 0 && <div className="p-10 text-center text-sm text-slate-400">לא נמצאו הודעות מתאימות.</div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}