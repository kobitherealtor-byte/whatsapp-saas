import Link from 'next/link';

const features = [
  {
    title: 'WhatsApp Scheduler',
    text: 'מתזמנים הודעה אישית ללקוח לתאריך ושעה מדויקים, עורכים, מבטלים או שולחים מיד.',
  },
  {
    title: 'Group Publisher',
    text: 'מגדירים פעם אחת קבוצות, ימים ושעה — והמערכת מפרסמת לפי התוכנית באופן אוטומטי.',
  },
  {
    title: 'Holiday Guard',
    text: 'אפשר לעצור פרסומים אוטומטית בחגים בישראל בלי לזכור לכבות קמפיינים ידנית.',
  },
  {
    title: 'היסטוריה ובקרה',
    text: 'רואים מה נשלח, מה נכשל, מה דולג ומפעילים ניסיון חוזר כשצריך.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.10),_transparent_30%),linear-gradient(to_bottom,_#f8fffc,_#f8fafc_46%,_#ffffff)] text-slate-900" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="font-black text-slate-900">WhatsApp Plus</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-bold text-emerald-700 sm:inline">חינם · עד 3 צ׳אטים · בלי כרטיס אשראי</span>
            <Link href="/login?mode=register" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-500">
              התחל בחינם
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[88vh] max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-700">
            WhatsApp automation, בלי כאב ראש
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            מתזמנים הודעות ומפרסמים לקבוצות WhatsApp — במקום אחד.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            מערכת פשוטה לעסקים קטנים: הודעות אישיות מתוזמנות ופרסום אוטומטי לקבוצות, עם חיבור WhatsApp פשוט דרך QR — בלי להיכנס ל-Make.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
            מתחילים בחינם · עד 3 צ׳אטים שונים · ללא כרטיס אשראי
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?mode=register" className="rounded-2xl bg-emerald-600 px-7 py-3.5 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500">
              התחל בחינם — 3 צ׳אטים
            </Link>
            <Link href="/demo" className="rounded-2xl border border-emerald-200 bg-white px-6 py-3 font-bold text-emerald-800 shadow-sm hover:bg-emerald-50">
              צפייה בדמו
            </Link>
            <a href="#how-it-works" className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              איך זה עובד
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'מתחברים'],
              ['2', 'מתזמנים'],
              ['3', 'המערכת שולחת'],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-sm font-black text-emerald-700">{number}</div>
                <div className="mt-1 font-bold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">היום</div>
              <div className="text-xl font-bold">3 שליחות מתוכננות</div>
            </div>
            <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-700">WhatsApp מחובר</div>
          </div>
          <div className="space-y-3">
            {[
              ['10:30', 'פרסום ל-8 קבוצות', 'מבצע סוף שבוע'],
              ['13:00', 'הודעה אישית', 'יוסי כהן'],
              ['17:00', 'פרסום ל-3 קבוצות', 'עדכון שבועי'],
            ].map(([time, type, title]) => (
              <div key={time + title} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div>
                  <div className="font-bold">{title}</div>
                  <div className="mt-1 text-sm text-slate-500">{type}</div>
                </div>
                <div className="font-mono text-emerald-700">{time}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            כל עסק מחבר את חשבון ה-WhatsApp שלו בעצמו באמצעות QR. פרטי החיבור נשמרים בצד השרת ואינם מוצגים למשתמש.
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-white/75 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <div className="text-sm font-bold text-emerald-700">שני כלים. ממשק אחד.</div>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">פשוט מספיק לעבודה יומיומית</h2>
            <p className="mt-4 leading-7 text-slate-600">
              אין צורך להיכנס למערכות אוטומציה או לעבוד עם מפתחות API. המשתמש מנהל הכל מתוך המערכת.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-500">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row">
            <div>
              <div className="text-lg font-black text-emerald-950">רוצים לבדוק על ה-WhatsApp שלכם?</div>
              <div className="mt-1 text-sm text-emerald-800">פותחים חשבון בחינם, מחברים QR ומתחילים עם עד 3 צ׳אטים.</div>
            </div>
            <Link href="/login?mode=register" className="w-full rounded-2xl bg-emerald-600 px-6 py-3 text-center font-black text-white hover:bg-emerald-500 sm:w-auto">
              פתח חשבון חינם
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            ['חיבור עצמאי', 'סריקת QR מתוך המערכת והצגת סטטוס החיבור בזמן אמת.'],
            ['שליחה בטוחה יותר', 'אם החיבור נופל, השליחות ממתינות במקום להישלח שוב ושוב ולהיכשל.'],
            ['בקרה מלאה', 'ניהול קבוצות, היסטוריה, ניסיונות חוזרים ומעקב אחרי כל קמפיין.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-5">
              <div className="font-black">{title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{text}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">מתחילים בחינם — בלי כרטיס אשראי</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              חברו WhatsApp והתחילו לעבוד עם עד 3 אנשי קשר או קבוצות שונים. לאותם צ׳אטים אפשר לשלוח שוב ושוב.
            </p>
          </div>
          <Link href="/login?mode=register" className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-sm hover:bg-emerald-500 sm:mt-0">
            התחל עכשיו בחינם
          </Link>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <Link href="/login?mode=register" className="block rounded-2xl bg-emerald-600 px-5 py-3 text-center font-black text-white">
          התחל בחינם · עד 3 צ׳אטים
        </Link>
      </div>

      <footer className="border-t border-slate-200 bg-white pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-slate-500">
          <div>WhatsApp Plus</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-emerald-700">תנאי שימוש</Link>
            <Link href="/privacy" className="hover:text-emerald-700">פרטיות</Link>
            <Link href="/acceptable-use" className="hover:text-emerald-700">שימוש מקובל</Link>
            <Link href="/cancellation" className="hover:text-emerald-700">ביטול והחזרים</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
