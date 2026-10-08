import Link from 'next/link';
import AppShell from '@/components/AppShell';
import NewCampaignForm from '@/components/NewCampaignForm';
import { getWhatsAppGroups } from '@/lib/data';

export default async function NewCampaignPage() {
  const groups = await getWhatsAppGroups();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6">
          <Link href="/publisher" className="text-sm font-bold text-emerald-700 hover:underline">← חזרה לקמפיינים</Link>
          <h1 className="mt-3 text-3xl font-black">קמפיין קבוצות חדש</h1>
          <p className="mt-1 text-slate-500">בוחרים קבוצות, תוכן ותזמון קבוע. פשוט וברור.</p>
        </div>
        <NewCampaignForm groups={groups} />
      </div>
    </AppShell>
  );
}
