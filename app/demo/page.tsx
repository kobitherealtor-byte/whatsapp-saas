import Link from 'next/link';

const cards = [
  ['6', 'שליחות היום'],
  ['2', 'קמפיינים פעילים'],
  ['18', 'קבוצות זמינות'],
  ['0', 'תקלות פתוחות'],
];

const scheduled = [
  ['10:30', 'יוסי כהן', 'תזכורת לפגישה'],
  ['13:00', 'קמפיין לקוחות חמים', '124 נמענים'],
  ['17:15', 'קהילת ויצמן', 'פרסום לקבוצה'],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="font-black">WhatsApp Plus</div>
            <div className="text-xs text-slate-400">מצב הדגמה</div>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">
              חזרה לאתר
            </Link>
            <Link href="/login?mode=register" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">
              התחל בחינם
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900">
          זהו מסך הדגמה בלבד. אין כאן WhatsApp מחובר ולא מתבצעות שליחות אמיתיות.
        </div>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="font-black text-emerald-950">רוצה לנסות את זה על ה-WhatsApp שלך?</div>
            <div className="mt-1 text-sm text-emerald-800">ההרשמה חינם, עד 3 צ׳אטים שונים, בלי כרטיס אשראי.</div>
          </div>
          <Link href="/login?mode=register" className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-center font-black text-white sm:w-auto">
            פתח חשבון חינם
          </Link>
        </div>

        <header className="mb-8">
          <p className="text-sm font-semibold text-emerald-700">מרכז השליטה</p>
          <h1 className="mt-1 text-3xl font-black">לוח בקרה לדוגמה</h1>
          <p className="mt-2 text-slate-500">
            כך נראית סביבת העבודה אחרי שהחשבון מחובר ומוכן לפעולה.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black">השליחות הקרובות</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {scheduled.map(([time, title, detail]) => (
                <div key={time + title} className="grid gap-2 p-5 sm:grid-cols-[80px_1fr_auto] sm:items-center">
                  <div className="font-mono font-black text-emerald-700">{time}</div>
                  <div>
                    <div className="font-bold">{title}</div>
                    <div className="text-xs text-slate-400">{detail}</div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    מתוזמן
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            {[
              ['הודעות מתוזמנות', 'שליחה אישית ללקוח בזמן מדויק.'],
              ['Broadcasts', 'ייבוא Excel, התאמה אישית ומעקב לכל נמען.'],
              ['Group Publisher', 'פרסום אוטומטי לקבוצות לפי ימים ושעות.'],
              ['Inbox', 'שיחות WhatsApp מתוך המערכת.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="font-black">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{text}</div>
              </div>
            ))}
          </section>
        </div>
        <div className="mt-10 rounded-3xl bg-slate-950 p-7 text-white sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">הדמו נראה טוב? עכשיו נסה באמת.</h2>
            <p className="mt-2 text-sm text-slate-300">חבר WhatsApp והתחל בחינם עם עד 3 צ׳אטים.</p>
          </div>
          <Link href="/login?mode=register" className="mt-5 inline-flex rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 sm:mt-0">
            התחל בחינם
          </Link>
        </div>
      </div>
    </main>
  );
}
