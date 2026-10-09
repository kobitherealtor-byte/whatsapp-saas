import AppShell from '@/components/AppShell';
import { getUpcomingHolidayDates } from '@/lib/data';
import { ensureHolidayGuardCalendar } from '@/lib/holidays';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(`${value}T12:00:00+03:00`));
}

export default async function HolidayGuardPage() {
  await ensureHolidayGuardCalendar();
  const holidays = await getUpcomingHolidayDates(40);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Holiday Guard</p>
          <h1 className="mt-1 text-3xl font-black">חגים שבהם המערכת לא תפרסם</h1>
          <p className="mt-2 text-slate-500">
            קמפיין שמוגדר עם דילוג על חגים לא ישלח בקבוצות בתאריכים האלה.
          </p>
        </header>

        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          הרשימה מתעדכנת אוטומטית עבור ישראל. כרגע Holiday Guard מיועד לימי חג (Yom Tov), לא לכל ערב חג או חול המועד.
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_1.4fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500">
            <div>תאריך</div>
            <div>חג</div>
          </div>

          <div className="divide-y divide-slate-100">
            {holidays.map((holiday) => (
              <div key={`${holiday.holiday_date}:${holiday.name}`} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_1.4fr]">
                <div className="text-sm font-semibold text-slate-700">{formatDate(holiday.holiday_date)}</div>
                <div className="text-sm font-bold">{holiday.name}</div>
              </div>
            ))}

            {holidays.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">
                עדיין אין תאריכי חג שמורים. הם יסונכרנו אוטומטית לפני הרצת קמפיינים.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
