import { notFound } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getAdminDashboardData } from '@/lib/admin';

function statusLabel(status: string) {
  if (status === 'connected') return 'מחובר';
  if (status === 'waiting_for_qr') return 'ממתין ל-QR';
  if (status === 'creating') return 'בהקמה';
  if (status === 'error') return 'דורש טיפול';
  return 'מנותק';
}

export default async function AdminPage() {
  let data;
  try {
    data = await getAdminDashboardData();
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') notFound();
    throw error;
  }

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin</p>
            <h1 className="mt-1 text-3xl font-black">ניהול המערכת</h1>
            <p className="mt-2 text-slate-500">
              תמונת מצב של לקוחות, חיבורי WhatsApp ושימוש — בלי להציג טוקנים או סודות.
            </p>
          </div>
          <Link href="/system-status" className="text-sm font-bold text-emerald-700 hover:underline">
            מצב מערכת
          </Link>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [data.totals.customers, 'לקוחות'],
            [data.totals.connected, 'WhatsApp מחוברים'],
            [data.totals.active, 'חשבונות פעילים'],
            [data.totals.failed24h, 'כשלי שליחה ב-24 שעות'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">לקוח</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">תוכנית</th>
                  <th className="px-4 py-3">שליחות בתקופה</th>
                  <th className="px-4 py-3">ממתינות</th>
                  <th className="px-4 py-3">קבוצות</th>
                  <th className="px-4 py-3">תפוצה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-4">
                      <div className="font-bold">{customer.businessName || 'ללא שם עסק'}</div>
                      <div className="mt-1 text-xs text-slate-400">{customer.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold">{statusLabel(customer.whatsappStatus)}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {customer.phoneNumber || customer.providerState || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold">{customer.planCode}</div>
                      <div className="text-xs text-slate-400">{customer.billingStatus}</div>
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {customer.sentThisPeriod} / {customer.monthlySendLimit}
                    </td>
                    <td className="px-4 py-4">{customer.pendingMessages}</td>
                    <td className="px-4 py-4">{customer.activeGroupCampaigns}</td>
                    <td className="px-4 py-4">{customer.activeBroadcasts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.customers.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">עדיין אין לקוחות.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
