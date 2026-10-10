'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CampaignRow, WhatsAppGroupRow } from '@/lib/data';
import { setCampaignStatus } from '@/app/actions/campaigns';

const dayLabels = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function formatNextRun(value: string | null) {
  if (!value) return 'טרם חושב';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default function PublisherClient({
  campaigns,
  groups,
  deliveryStats,
}: {
  campaigns: CampaignRow[];
  groups: WhatsAppGroupRow[];
  deliveryStats: Array<{
    campaignId: string;
    sent: number;
    failed: number;
    pending: number;
    processing: number;
    skipped: number;
  }>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const changeStatus = async (
    id: string,
    status: 'active' | 'paused' | 'cancelled',
  ) => {
    if (
      status === 'cancelled' &&
      !window.confirm('לבטל את הקמפיין? הפעולה תעצור פרסומים עתידיים.')
    ) {
      return;
    }

    setBusyId(id);
    setError('');

    try {
      await setCampaignStatus(id, status);
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

  const activeCount = campaigns.filter((campaign) => campaign.status === 'active').length;

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black">פרסום לקבוצות</h1>
          <p className="mt-1 text-slate-500">קמפיינים קבועים לקבוצות WhatsApp לפי ימים ושעות.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/holiday-guard" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">Holiday Guard</Link>
          <Link href="/groups" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">ניהול קבוצות</Link>
          <Link href="/publisher/new" className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">+ קמפיין חדש</Link>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        {[[String(activeCount), 'קמפיינים פעילים'], [String(groups.length), 'קבוצות זמינות'], [String(campaigns.length), 'סה״כ קמפיינים']].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-3xl font-black">{value}</div>
            <div className="mt-1 text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_.5fr_1fr_1fr_.7fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
          <div>קמפיין</div><div>קבוצות</div><div>תזמון</div><div>הרצה הבאה</div><div>סטטוס</div><div>פעולות</div>
        </div>

        <div className="divide-y divide-slate-100">
          {campaigns.map((campaign) => {
            const groupCount = campaign.campaign_groups?.length ?? 0;
            const stats = deliveryStats.find((item) => item.campaignId === campaign.id);
            const schedule = campaign.days_of_week.length
              ? `${campaign.days_of_week.map((day) => dayLabels[day] ?? day).join(', ')} · ${campaign.send_time.slice(0, 5)}`
              : `ללא ימים · ${campaign.send_time.slice(0, 5)}`;

            return (
              <div key={campaign.id} className="grid gap-3 p-5 md:grid-cols-[1.4fr_.5fr_1fr_1fr_.7fr_1fr] md:items-center">
                <div>
                  <div className="font-bold">{campaign.name}</div>
                  <div className="mt-1 truncate text-xs text-slate-400">{campaign.message_body}</div>
                  {campaign.last_error && (
                    <div className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                      {campaign.prepare_fail_count >= 3 ? 'הושהה אוטומטית: ' : 'דורש תשומת לב: '}
                      {campaign.last_error}
                    </div>
                  )}
                  {stats && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="text-emerald-700">נשלחו {stats.sent}</span>
                      {stats.failed > 0 && <span className="text-red-600">נכשלו {stats.failed}</span>}
                      {(stats.pending + stats.processing) > 0 && <span className="text-amber-700">ממתינות {stats.pending + stats.processing}</span>}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold">{groupCount}</div>
                <div className="text-sm text-slate-600">{schedule}</div>
                <div className="text-sm text-slate-600">{formatNextRun(campaign.next_run_at)}</div>
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    campaign.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800'
                      : campaign.status === 'paused'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {campaign.status === 'active'
                      ? 'פעיל'
                      : campaign.status === 'paused'
                        ? 'מושהה'
                        : campaign.status === 'cancelled'
                          ? 'בוטל'
                          : campaign.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <Link
                    href={`/publisher/${campaign.id}`}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    סטטוס
                  </Link>
                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <Link
                      href={`/publisher/${campaign.id}/edit`}
                      className="text-slate-700 hover:text-slate-950"
                    >
                      עריכה
                    </Link>
                  )}

                  {campaign.status === 'active' && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void changeStatus(campaign.id, 'paused')}
                      className="text-amber-700 hover:text-amber-900 disabled:opacity-50"
                    >
                      השהה
                    </button>
                  )}

                  {campaign.status === 'paused' && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void changeStatus(campaign.id, 'active')}
                      className="text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                    >
                      הפעל
                    </button>
                  )}

                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() => void changeStatus(campaign.id, 'cancelled')}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      בטל
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {campaigns.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              עדיין לא נוצרו קמפיינים.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
