import Link from 'next/link';

const features = [
  {
    title: 'WhatsApp Scheduler',
    text: 'מתזמנים הודעה אישית ללקוח לתאריך ושעה מדויקים, עורכים, מבטלים או שולחים מיד.',
  },
  {
    title: 'Broadcast Campaigns',
    text: 'מעלים רשימת נמענים ושולחים הודעה אישית לכל מספר עם תזמון, קצב שליחה ומעקב.',
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
    <main className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <section className="mx-auto grid min-h-[88vh] max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
            WhatsApp automation, בלי כאב ראש
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            מתזמנים, מפיצים ומנהלים WhatsApp — במקום אחד.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            מערכת SaaS לעסקים קטנים שרוצים לעבוד עם WhatsApp בצורה מסודרת:
            הודעות אישיות מתוזמנות, קמפייני תפוצה, פרסום קבוע לקבוצות, בקרה על שליחות וחיבור פשוט דרך QR.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-400">
              כניסה למערכת
            </Link>
            <a href="#how-it-works" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-white hover:bg-white/10">
              איך זה עובד
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'מתחברים'],
              ['2', 'מתזמנים'],
              ['3', 'המערכת שולחת'],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-black text-emerald-300">{number}</div>
                <div className="mt-1 font-bold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">היום</div>
              <div className="text-xl font-bold">3 שליחות מתוכננות</div>
            </div>
            <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">WhatsApp מחובר</div>
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

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
            כל עסק מחבר את חשבון ה-WhatsApp שלו בעצמו באמצעות QR. פרטי החיבור נשמרים בצד השרת ואינם מוצגים למשתמש.
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <div className="text-sm font-bold text-emerald-300">שלושה מנועי שליחה. ממשק אחד.</div>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">פשוט מספיק לעבודה יומיומית</h2>
            <p className="mt-4 leading-7 text-slate-300">
              אין צורך להיכנס למערכות אוטומציה או לעבוד עם מפתחות API. המשתמש מנהל הכל מתוך המערכת.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{feature.text}</p>
              </div>
            ))}
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
            <div key={title} className="rounded-2xl border border-white/10 p-5">
              <div className="font-black">{title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">המוצר נמצא כעת בשלב Beta</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              אנחנו משלימים את חיבורי הספק והבדיקות לפני פתיחה מסחרית מלאה.
            </p>
          </div>
          <Link href="/login" className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 sm:mt-0">
            כניסה ל-Beta
          </Link>
        </div>
      </section>
    </main>
  );
}
