import Link from 'next/link';
import AppShell from '@/components/AppShell';

const upcoming = [
  { target: 'יוסי כהן', type: 'הודעה אישית', body: 'תזכורת: הפגישה שלנו נקבעה למחר...', time: '15:30', tone: 'emerald' },
  { target: '8 קבוצות', type: 'פרסום בקבוצות', body: 'מבצעי סוף השבוע החלו! קבלו הצצה...', time: '17:00', tone: 'blue' },
];

export default function Dashboard() {
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

        <section className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <div>
                <div className="font-bold text-emerald-950">WhatsApp מחובר</div>
                <div className="text-sm text-emerald-700">החיבור פעיל ומוכן לשליחה</div>
              </div>
            </div>
            <Link href="/settings" className="text-sm font-bold text-emerald-800 hover:underline">ניהול חיבור</Link>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[['5', 'מתוזמנות להיום'], ['2', 'קמפיינים פעילים'], ['11', 'קבוצות מחוברות'], ['0', 'שליחות שנכשלו']].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-extrabold">השליחות הקרובות</h2>
              <p className="text-sm text-slate-500">מה אמור לצאת בשעות הקרובות</p>
            </div>
            <Link href="/calendar" className="text-sm font-bold text-emerald-700 hover:underline">פתח יומן</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.map((item) => (
              <div key={item.target + item.time} className="grid gap-3 p-5 sm:grid-cols-[1.1fr_1fr_2fr_auto] sm:items-center">
                <div className="font-bold">{item.target}</div>
                <div className={item.tone === 'emerald' ? 'text-sm font-bold text-emerald-700' : 'text-sm font-bold text-blue-700'}>{item.type}</div>
                <div className="truncate text-sm text-slate-500">{item.body}</div>
                <div className="font-mono text-sm font-bold text-slate-700">{item.time}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}