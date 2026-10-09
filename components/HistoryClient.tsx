'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { retryScheduledMessage } from '@/app/actions/messages';
import type { DeliveryHistoryItem } from '@/lib/data';

const statusLabels = {
  sent: 'נשלח',
  failed: 'נכשל',
  skipped: 'דולג',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default function HistoryClient({ items }: { items: DeliveryHistoryItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'skipped'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => items.filter((item) => filter === 'all' || item.status === filter),
    [filter, items],
  );

  const retry = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await retryScheduledMessage(id);
      router.refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'הניסיון החוזר נכשל.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-6">
        <h1 className="text-3xl font-black">היסטוריית שליחות</h1>
        <p className="mt-1 text-slate-500">מה נשלח, מה נכשל ומה דולג.</p>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          ['all', 'הכל'],
          ['sent', 'נשלח'],
          ['failed', 'נכשל'],
          ['skipped', 'דולג'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[.7fr_1.1fr_1.4fr_1fr_.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
          <div>סוג</div><div>יעד</div><div>פרטים</div><div>זמן</div><div>סטטוס</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[.7fr_1.1fr_1.4fr_1fr_.7fr] md:items-center">
              <div className="text-sm font-bold">{item.source === 'personal' ? 'אישי' : 'קבוצה'}</div>
              <div>
                <div className="text-sm font-bold">{item.title}</div>
                <div className="text-xs text-slate-400">{item.destination}</div>
              </div>
              <div>
                <div className="line-clamp-2 text-sm text-slate-600">{item.detail || '—'}</div>
                {item.error && <div className="mt-1 text-xs font-semibold text-red-600">{item.error}</div>}
              </div>
              <div className="text-sm text-slate-600">{formatDate(item.occurredAt)}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  item.status === 'sent'
                    ? 'bg-emerald-50 text-emerald-800'
                    : item.status === 'failed'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-amber-50 text-amber-800'
                }`}>
                  {statusLabels[item.status]}
                </span>
                {item.retryMessageId && (
                  <button
                    type="button"
                    disabled={busyId === item.retryMessageId}
                    onClick={() => void retry(item.retryMessageId!)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                  >
                    נסה שוב
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">אין שליחות להצגה.</div>
          )}
        </div>
      </div>
    </div>
  );
}
