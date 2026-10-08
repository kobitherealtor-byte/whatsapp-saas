import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getDashboardData } from '@/lib/data';

function formatTime(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default async function Dashboard() {
  const data = await getDashboardData();
  const isConnected = data.connection?.status === 'connected';

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">מרכז השליטה שלך ב-WhatsApp</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">לוח בקרה</h1>
            <p className="mt-2 text-slate-500">כל מה שמתוזמן, פעיל או דורש תשומת לב — במקום אחד.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scheduler/new" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">+ הודעה חדשה</Link>
            <Link href="/publisher/new" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">+ קמפיין קבוצות</Link>
          </div>
        </header>

        <section className={`mb-6 rounded-2xl border p-4 ${isConnected ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ring-4 ${isConnected ? 'bg-emerald-500 ring-emerald-100' : 'bg-amber-500 ring-amber-100'}`} />
              <div>
                <div className={`font-bold ${isConnected ? 'text-emerald-950' : 'text-amber-950'}`}>
                  {isConnected ? 'WhatsApp מחובר' : 'WhatsApp עדיין לא מחובר'}
                </div>
                <div className={`text-sm ${isConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isConnected
                    ? data.connection?.phone_number
                      ? `מספר מחובר: ${data.connection.phone_number}`
                      : 'החיבור פעיל ומוכן לשליחה'
                    : 'חבר את החשבון כדי להתחיל לשלוח בפועל'}
                </div>
              </div>
            </div>
            <Link href="/settings" className={`text-sm font-bold hover:underline ${isConnected ? 'text-emerald-800' : 'text-amber-800'}`}>ניהול חיבור</Link>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            [String(data.scheduledNext24h), 'מתוזמנות ל-24 השעות הקרובות'],
            [String(data.activeCampaigns), 'קמפיינים פעילים'],
            [String(data.groups), 'קבוצות זמינות'],
            [String(data.failed), 'שליחות שנכשלו'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-extrabold">ההודעות הקרובות</h2>
              <p className="text-sm text-slate-500">הודעות אישיות שמחכות לשליחה</p>
            </div>
            <Link href="/scheduler" className="text-sm font-bold text-emerald-700 hover:underline">לכל ההודעות</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.upcoming.map((item) => (
              <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1.1fr_2fr_auto] sm:items-center">
                <div>
                  <div className="font-bold">{item.recipient_name || 'ללא שם'}</div>
                  <div className="text-xs text-slate-400">{item.recipient_number}</div>
                </div>
                <div className="truncate text-sm text-slate-500">{item.message_body}</div>
                <div className="font-mono text-sm font-bold text-slate-700">{formatTime(item.scheduled_time)}</div>
              </div>
            ))}
            {data.upcoming.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">אין הודעות שממתינות לשליחה כרגע.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
