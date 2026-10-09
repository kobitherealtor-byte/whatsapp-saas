import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getAutomationHealth } from '@/lib/data';

function formatDate(value: string | null) {
  if (!value) return 'עדיין אין הרצות';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default async function SystemStatusPage() {
  const health = await getAutomationHealth();

  const tone =
    health.status === 'healthy'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : health.status === 'attention'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">System Health</p>
            <h1 className="mt-1 text-3xl font-black">מצב מערכת השליחות</h1>
            <p className="mt-2 text-slate-500">בדיקה מהירה של מנוע האוטומציה והרצות האחרונות.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-bold text-emerald-700 hover:underline">חזרה ללוח הבקרה</Link>
        </header>

        <section className={`mb-5 rounded-2xl border p-5 ${tone}`}>
          <div className="text-lg font-black">
            {health.status === 'healthy'
              ? 'המערכת תקינה'
              : health.status === 'attention'
                ? 'נדרש לבדוק את ההרצה האחרונה'
                : 'עדיין אין מספיק נתוני הרצה'}
          </div>
          <div className="mt-2 text-sm">
            הרצה אחרונה: {formatDate(health.lastRunAt)}
          </div>
          {health.lastError && (
            <div className="mt-3 rounded-xl bg-white/60 p-3 text-sm font-semibold">
              {health.lastError}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [health.runs24h, 'הרצות ב-24 שעות'],
            [health.sent24h, 'שליחות הצליחו'],
            [health.failed24h, 'שליחות נכשלו'],
            [health.failures24h, 'הרצות מערכת שנכשלו'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          המערכת היא Event-driven: אם אין הודעות או קמפיינים שממתינים לשליחה, ה-Worker לא אמור לרוץ סתם. לכן חוסר בהרצות אינו בהכרח תקלה.
        </div>
      </div>
    </AppShell>
  );
}
