'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  setBroadcastCampaignStatus,
  retryFailedBroadcastRecipients,
} from '@/app/actions/broadcasts';
import type { BroadcastCampaignRow } from '@/lib/data';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  draft: 'טיוטה',
  active: 'פעיל',
  paused: 'מושהה',
  completed: 'הסתיים',
  cancelled: 'בוטל',
};

export default function BroadcastsClient({
  campaigns,
}: {
  campaigns: BroadcastCampaignRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const changeStatus = async (
    id: string,
    status: 'active' | 'paused' | 'cancelled',
  ) => {
    setBusyId(id);
    setError('');
    try {
      await setBroadcastCampaignStatus(id, status);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'עדכון הקמפיין נכשל.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const retryFailed = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await retryFailedBroadcastRecipients(id);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'הניסיון החוזר נכשל.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Broadcast Campaigns</p>
          <h1 className="mt-1 text-3xl font-black">קמפיינים של הודעות תפוצה</h1>
          <p className="mt-2 text-slate-500">
            הודעה אישית לכל נמען, עם תזמון, קצב שליחה וסטטוס לכל מספר.
          </p>
        </div>
        <Link
          href="/broadcasts/new"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
        >
          + קמפיין תפוצה חדש
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const processed =
            campaign.sent_count +
            campaign.failed_count +
            campaign.skipped_count;
          const progress =
            campaign.total_recipients > 0
              ? Math.min(
                  100,
                  Math.round((processed / campaign.total_recipients) * 100),
                )
              : 0;

          return (
            <article
              key={campaign.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">{campaign.name}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {statusLabels[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {campaign.message_body}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                    <span>{campaign.total_recipients} נמענים</span>
                    <span>מתוזמן: {formatDate(campaign.scheduled_for)}</span>
                    <span>מרווח: {campaign.send_interval_seconds} שנ׳</span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span>{progress}%</span>
                      <span>
                        {processed} / {campaign.total_recipients}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                    <span className="text-emerald-700">
                      נשלחו {campaign.sent_count}
                    </span>
                    {campaign.failed_count > 0 && (
                      <span className="text-red-600">
                        נכשלו {campaign.failed_count}
                      </span>
                    )}
                    <span className="text-slate-500">
                      ממתינים {Math.max(0, campaign.total_recipients - processed)}
                    </span>
                  </div>

                  {campaign.last_error && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {campaign.last_error}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <Link
                    href={`/broadcasts/${campaign.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    פירוט
                  </Link>

                  {campaign.status === 'active' && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void changeStatus(campaign.id, 'paused')}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 disabled:opacity-50"
                    >
                      השהה
                    </button>
                  )}

                  {campaign.status === 'paused' && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void changeStatus(campaign.id, 'active')}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 disabled:opacity-50"
                    >
                      המשך
                    </button>
                  )}

                  {campaign.failed_count > 0 && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void retryFailed(campaign.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 disabled:opacity-50"
                    >
                      נסה שוב לנכשלים
                    </button>
                  )}

                  {(campaign.status === 'active' ||
                    campaign.status === 'paused') && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => {
                        if (window.confirm('לבטל את הקמפיין?')) {
                          void changeStatus(campaign.id, 'cancelled');
                        }
                      }}
                      className="rounded-xl px-3 py-2 text-red-600 disabled:opacity-50"
                    >
                      ביטול
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {campaigns.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="font-bold">עדיין אין קמפיינים של תפוצה.</div>
            <div className="mt-2 text-sm text-slate-500">
              העלה רשימת מספרים או הדבק נמענים וצור את הקמפיין הראשון.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
