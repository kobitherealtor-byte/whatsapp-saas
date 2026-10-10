import Link from 'next/link';
import AppShell from '@/components/AppShell';
import AdminPlansClient from '@/components/AdminPlansClient';
import { getAdminPlans } from '@/lib/admin';

export default async function AdminPlansPage() {
  const plans = await getAdminPlans();

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6">
          <Link href="/admin" className="text-sm font-bold text-emerald-700 hover:underline">
            ← חזרה ל-Admin
          </Link>
          <h1 className="mt-3 text-3xl font-black">חבילות ופיצ׳רים</h1>
          <p className="mt-2 text-slate-500">
            מגדירים פעם אחת מה כל חבילה כוללת. בעתיד ספק הסליקה ישייך לקוח לחבילה והמוצר ייפתח אוטומטית.
          </p>
        </header>
        <AdminPlansClient plans={plans} />
      </div>
    </AppShell>
  );
}
