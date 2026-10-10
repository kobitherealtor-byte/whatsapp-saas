import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminCustomersClient from '@/components/AdminCustomersClient';
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
          <div className="flex items-center gap-3">
            <Link href="/admin/readiness" className="text-sm font-bold text-emerald-700 hover:underline">
              Launch Readiness
            </Link>
            <Link href="/admin/plans" className="text-sm font-bold text-emerald-700 hover:underline">
              חבילות ופיצ׳רים
            </Link>
            <Link href="/system-status" className="text-sm font-bold text-emerald-700 hover:underline">
              מצב מערכת
            </Link>
          </div>
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

        <AdminCustomersClient customers={data.customers} />
      </div>
    </AppShell>
  );
}
