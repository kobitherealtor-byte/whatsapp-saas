import { notFound } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import AdminCustomerControls from '@/components/AdminCustomerControls';
import AdminFeatureControls from '@/components/AdminFeatureControls';
import AdminBillingSimulator from '@/components/AdminBillingSimulator';
import { getAdminCustomerDetail, getAdminPlans } from '@/lib/admin';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getAdminCustomerDetail(id);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Forbidden' || error.message === 'Customer not found')
    ) {
      notFound();
    }
    throw error;
  }

  const plans = await getAdminPlans();

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6">
          <Link href="/admin" className="text-sm font-bold text-emerald-700 hover:underline">
            ← חזרה ללקוחות
          </Link>
          <h1 className="mt-3 text-3xl font-black">
            {data.customer.businessName || 'לקוח ללא שם עסק'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>{data.customer.email}</span>
            <span>נוצר: {formatDate(data.customer.createdAt)}</span>
            <span>כניסה אחרונה: {formatDate(data.customer.lastSignInAt)}</span>
          </div>
        </header>

        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [data.connection?.status ?? 'disconnected', 'מצב WhatsApp'],
            [data.usage.pendingMessages, 'הודעות ממתינות'],
            [data.usage.activeGroupCampaigns, 'קמפיינים לקבוצות'],
            [data.usage.activeBroadcasts, 'קמפייני תפוצה'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="break-words text-2xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
          <AdminCustomerControls
            customerId={data.customer.id}
            initial={data.limits}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">חיבור WhatsApp</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">מספר</span>
                <span className="font-bold">{data.connection?.phone_number || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Provider state</span>
                <span className="font-bold">{data.connection?.provider_state || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">בדיקה אחרונה</span>
                <span className="font-bold">{formatDate(data.connection?.last_checked_at ?? null)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">חובר בתאריך</span>
                <span className="font-bold">{formatDate(data.connection?.connected_at ?? null)}</span>
              </div>
              {data.connection?.last_error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {data.connection.last_error}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <AdminBillingSimulator
            customerId={data.customer.id}
            plans={plans}
            currentPlan={data.limits.planCode}
            currentStatus={data.limits.billingStatus}
          />
          <AdminFeatureControls
            customerId={data.customer.id}
            entitlements={data.entitlements}
          />
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">שליחות אחרונות</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {data.recentLogs.map((log) => (
              <div key={log.id} className="grid gap-2 py-3 sm:grid-cols-[.7fr_1fr_1.5fr_1fr] sm:items-center">
                <div className="font-bold">{log.status}</div>
                <div className="text-sm text-slate-500">{log.kind || '—'}</div>
                <div className="truncate text-sm text-slate-600">{log.destination || log.detail || '—'}</div>
                <div className="text-xs text-slate-400">{formatDate(log.sent_at || log.created_at)}</div>
              </div>
            ))}
            {data.recentLogs.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">אין עדיין שליחות להצגה.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
