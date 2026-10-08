import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="mb-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
              WhatsApp automation, בלי כאב ראש
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              מתזמנים הודעות ומפרסמים לקבוצות — במקום אחד.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              ממשק פשוט לעסקים שרוצים לשלוח בזמן, לפרסם באופן קבוע ולראות בדיוק מה עומד לקרות.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-400">
                כניסה למערכת
              </Link>
              <Link href="/settings" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-white hover:bg-white/10">
                חיבור WhatsApp
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">היום</div>
                <div className="text-xl font-bold">3 שליחות מתוכננות</div>
              </div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">מחובר</div>
            </div>
            <div className="space-y-3">
              {[
                ['10:30', 'פרסום ל-8 קבוצות', 'מבצע סוף שבוע'],
                ['13:00', 'הודעה אישית', 'יוסי כהן'],
                ['17:00', 'פרסום ל-3 קבוצות', 'עדכון שבועי'],
              ].map(([time, type, title]) => (
                <div key={time + title} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="font-bold">{title}</div>
                    <div className="mt-1 text-sm text-slate-400">{type}</div>
                  </div>
                  <div className="font-mono text-emerald-300">{time}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}