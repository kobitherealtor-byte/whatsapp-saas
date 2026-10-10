'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  markAccountAlertRead,
  markAllAccountAlertsRead,
} from '@/app/actions/alerts';

type AlertRow = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  href: string | null;
  is_read: boolean;
  updated_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

function alertClass(severity: AlertRow['severity']) {
  if (severity === 'critical') return 'border-red-200 bg-red-50';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50';
  return 'border-sky-200 bg-sky-50';
}

export default function AlertsClient({ alerts }: { alerts: AlertRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {alerts.filter((alert) => !alert.is_read).length} התראות שלא נקראו
        </div>
        {alerts.some((alert) => !alert.is_read) && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await markAllAccountAlertsRead();
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            סמן הכל כנקרא
          </button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={'rounded-2xl border p-5 shadow-sm ' + alertClass(alert.severity)}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black">{alert.title}</h2>
                  {!alert.is_read && (
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                      חדש
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{alert.message}</p>
                <div className="mt-2 text-xs text-slate-400">{formatDate(alert.updated_at)}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {alert.href && (
                  <Link
                    href={alert.href}
                    onClick={() => void markAccountAlertRead(alert.id)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                  >
                    לטיפול
                  </Link>
                )}
                {!alert.is_read && (
                  <button
                    type="button"
                    onClick={async () => {
                      await markAccountAlertRead(alert.id);
                      router.refresh();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    סמן כנקרא
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {alerts.length === 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="text-xl font-black text-emerald-900">הכל תקין</div>
            <div className="mt-2 text-sm text-emerald-800">אין כרגע התראות שדורשות טיפול.</div>
          </div>
        )}
      </div>
    </div>
  );
}
