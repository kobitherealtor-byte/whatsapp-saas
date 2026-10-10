import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getLaunchReadiness } from '@/lib/launch-readiness';

export default async function AdminReadinessPage() {
  const data = await getLaunchReadiness();
  const percent = Math.round((data.readyCount / data.total) * 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <Link href="/admin" className="text-sm font-bold text-emerald-700 hover:underline">
            ← חזרה ל-Admin
          </Link>
          <h1 className="mt-3 text-3xl font-black">Launch Readiness</h1>
          <p className="mt-2 text-slate-500">
            תמונת מצב של הדברים שצריכים להיות מוכנים לפני פתיחה ללקוחות.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{data.readyCount} מתוך {data.total} מוכנים</span>
            <span>{percent}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: percent + '%' }}
            />
          </div>
        </section>

        <div className="space-y-3">
          {data.checks.map((check) => (
            <div
              key={check.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="font-black">{check.label}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">{check.detail}</div>
                </div>
                <span
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-bold ' +
                    (check.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-800'
                      : check.status === 'pending'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800')
                  }
                >
                  {check.status === 'ready'
                    ? 'מוכן'
                    : check.status === 'pending'
                      ? 'חסר'
                      : 'לא חוסם'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {data.blockers.length === 1 && data.blockers[0]?.key === 'green-partner' && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-900">
            כל החסימות בצד שלנו סגורות. נשאר רק GREEN API Partner.
          </div>
        )}
      </div>
    </AppShell>
  );
}
