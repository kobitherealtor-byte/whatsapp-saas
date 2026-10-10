import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EditCampaignForm from '@/components/EditCampaignForm';
import { getCampaignById, getWhatsAppGroups } from '@/lib/data';

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaignById(id);
  } catch {
    notFound();
  }

  if (!['active', 'paused'].includes(campaign.status)) {
    notFound();
  }

  const groups = await getWhatsAppGroups();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-black">עריכת קמפיין</h1>
          <p className="mt-1 text-slate-500">עדכן קבוצות, תוכן, ימים ושעות בלי ליצור קמפיין מחדש.</p>
        </div>
        <EditCampaignForm campaign={campaign} groups={groups} />
      </div>
    </AppShell>
  );
}
