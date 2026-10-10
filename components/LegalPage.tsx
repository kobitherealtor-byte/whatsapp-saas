import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-emerald-700 hover:underline">
            ← חזרה
          </Link>
          <div className="text-xs font-semibold text-slate-400">WhatsApp Plus · Beta</div>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-3 leading-7 text-slate-600">{intro}</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">{children}</div>
        </article>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
          <Link href="/terms" className="hover:text-emerald-700">תנאי שימוש</Link>
          <Link href="/privacy" className="hover:text-emerald-700">פרטיות</Link>
          <Link href="/acceptable-use" className="hover:text-emerald-700">שימוש מקובל</Link>
          <Link href="/cancellation" className="hover:text-emerald-700">ביטול והחזרים</Link>
        </div>
      </div>
    </main>
  );
}
