import { notFound } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getCampaignDispatches } from '@/lib/data';

const labels: Record<string, string> = {
  sent: 'נשלח',
  failed: 'נכשל',
  pending: 'ממתין',
  processing: 'בתהליך',
  skipped: 'דולג',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default async function CampaignStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getCampaignDispatches(id);
  } catch {
    notFound();
  }

  const counts = data.rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">סטטוס קמפיין</p>
            <h1 className="mt-1 text-3xl font-black">{data.campaign.name}</h1>
            <p className="mt-1 text-slate-500">פירוט השליחה לכל קבוצה והרצות קודמות.</p>
          </div>
          <Link href="/publisher" className="text-sm font-bold text-emerald-700 hover:underline">חזרה לקמפיינים</Link>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-5">
          {[
            ['sent', 'נשלחו'],
            ['failed', 'נכשלו'],
            ['pending', 'ממתינות'],
            ['processing', 'בתהליך'],
            ['skipped', 'דולגו'],
          ].map(([status, label]) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-black">{counts[status] ?? 0}</div>
              <div className="text-xs font-semibold text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_.8fr_1fr_1.2fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
            <div>קבוצה</div><div>סטטוס</div><div>מועד</div><div>פרטים</div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.rows.map((row) => (
              <div key={row.id} className="grid gap-3 p-5 md:grid-cols-[1.4fr_.8fr_1fr_1.2fr] md:items-center">
                <div className="font-bold">{row.groupName}</div>
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    row.status === 'sent'
                      ? 'bg-emerald-50 text-emerald-800'
                      : row.status === 'failed'
                        ? 'bg-red-50 text-red-800'
                        : row.status === 'skipped'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                  }`}>
                    {labels[row.status] ?? row.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600">{formatDate(row.sentAt || row.scheduledFor)}</div>
                <div className="text-xs text-slate-500">
                  {row.error ? <span className="font-semibold text-red-600">{row.error}</span> : row.retryCount > 0 ? `ניסיונות חוזרים: ${row.retryCount}` : '—'}
                </div>
              </div>
            ))}

            {data.rows.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">
                עדיין אין שליחות שנוצרו לקמפיין הזה.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
