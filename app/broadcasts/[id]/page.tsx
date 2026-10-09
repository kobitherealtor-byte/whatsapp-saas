import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BroadcastDetailClient from '@/components/BroadcastDetailClient';
import { getBroadcastCampaignById } from '@/lib/data';

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getBroadcastCampaignById(id);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <BroadcastDetailClient
        campaign={data.campaign}
        recipients={data.recipients}
      />
    </AppShell>
  );
}
