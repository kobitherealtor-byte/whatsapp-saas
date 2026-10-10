'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  retryBroadcastRecipient,
  retryFailedBroadcastRecipients,
  setBroadcastCampaignStatus,
} from '@/app/actions/broadcasts';
import type { BroadcastCampaignRow } from '@/lib/data';

type Recipient = {
  id: string;
  recipient_name: string | null;
  recipient_number: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped' | 'cancelled';
  retry_count: number;
  sent_at: string | null;
  error_text: string | null;
  available_at: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  pending: 'ממתין',
  processing: 'בתהליך',
  sent: 'נשלח',
  failed: 'נכשל',
  skipped: 'דולג',
  cancelled: 'בוטל',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default function BroadcastDetailClient({
  campaign,
  recipients,
}: {
  campaign: BroadcastCampaignRow;
  recipients: Recipient[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | Recipient['status']>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipients.filter((recipient) => {
      if (filter !== 'all' && recipient.status !== filter) return false;
      if (!q) return true;
      return (
        recipient.recipient_number.toLowerCase().includes(q) ||
        (recipient.recipient_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [recipients, filter, query]);

  const retryOne = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await retryBroadcastRecipient(id);
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

  const retryAll = async () => {
    setBusyId(campaign.id);
    setError('');
    try {
      await retryFailedBroadcastRecipients(campaign.id);
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

  const changeStatus = async (status: 'active' | 'paused' | 'cancelled') => {
    setBusyId(campaign.id);
    setError('');
    try {
      await setBroadcastCampaignStatus(campaign.id, status);
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

  const counts = recipients.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pb-20 lg:pb-0">
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="text-sm font-semibold text-emerald-700">
              Broadcast Campaign
            </div>
            <h1 className="mt-1 text-3xl font-black">{campaign.name}</h1>
            <div className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {campaign.message_body}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span>{campaign.total_recipients} נמענים</span>
              <span>התחלה: {formatDate(campaign.scheduled_for)}</span>
              <span>מרווח: {campaign.send_interval_seconds} שניות</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <a
              href={`/api/broadcasts/${campaign.id}/export`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              ייצוא CSV
            </a>
            {campaign.status === 'active' && (
              <button
                type="button"
                disabled={busyId === campaign.id}
                onClick={() => void changeStatus('paused')}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 disabled:opacity-50"
              >
                השהה
              </button>
            )}
            {campaign.status === 'paused' && (
              <button
                type="button"
                disabled={busyId === campaign.id}
                onClick={() => void changeStatus('active')}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 disabled:opacity-50"
              >
                המשך
              </button>
            )}
            {(counts.failed ?? 0) > 0 && (
              <button
                type="button"
                disabled={busyId === campaign.id}
                onClick={() => void retryAll()}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 disabled:opacity-50"
              >
                נסה שוב לכל הנכשלים
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['sent', 'נשלחו'],
          ['failed', 'נכשלו'],
          ['pending', 'ממתינים'],
          ['processing', 'בתהליך'],
          ['skipped', 'דולגו'],
          ['cancelled', 'בוטלו'],
        ].map(([status, label]) => (
          <div
            key={status}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-2xl font-black">{counts[status] ?? 0}</div>
            <div className="text-xs font-semibold text-slate-500">{label}</div>
          </div>
        ))}
      </section>

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם או מספר..."
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as 'all' | Recipient['status'])
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="sent">נשלח</option>
          <option value="failed">נכשל</option>
          <option value="pending">ממתין</option>
          <option value="processing">בתהליך</option>
          <option value="cancelled">בוטל</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_1.2fr_.8fr_1fr_1.3fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
          <div>שם</div>
          <div>מספר</div>
          <div>סטטוס</div>
          <div>זמן</div>
          <div>פרטים</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((recipient) => (
            <div
              key={recipient.id}
              className="grid gap-3 p-5 md:grid-cols-[1.2fr_1.2fr_.8fr_1fr_1.3fr] md:items-center"
            >
              <div className="font-bold">
                {recipient.recipient_name || 'ללא שם'}
              </div>
              <div className="font-mono text-sm text-slate-600">
                {recipient.recipient_number}
              </div>
              <div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    recipient.status === 'sent'
                      ? 'bg-emerald-50 text-emerald-800'
                      : recipient.status === 'failed'
                        ? 'bg-red-50 text-red-800'
                        : recipient.status === 'processing'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusLabels[recipient.status] ?? recipient.status}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(recipient.sent_at || recipient.available_at)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {recipient.error_text && (
                  <span className="text-xs font-semibold text-red-600">
                    {recipient.error_text}
                  </span>
                )}
                {recipient.status === 'failed' && (
                  <button
                    type="button"
                    disabled={busyId === recipient.id}
                    onClick={() => void retryOne(recipient.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    נסה שוב
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              לא נמצאו נמענים להצגה.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
