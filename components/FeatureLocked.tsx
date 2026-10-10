import Link from 'next/link';
import { FEATURE_LABELS, type FeatureKey } from '@/lib/feature-definitions';

export default function FeatureLocked({ feature }: { feature: FeatureKey }) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🔒</div>
      <h1 className="mt-5 text-2xl font-black">{FEATURE_LABELS[feature]} לא כלול כרגע בחשבון</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-amber-900">
        הפיצ׳ר יכול להיפתח בהתאם לחבילה, כתוספת בתשלום או באישור ידני של מנהל המערכת.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/billing" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
          תוכנית ושימוש
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
          חזרה ללוח הבקרה
        </Link>
      </div>
    </div>
  );
}
