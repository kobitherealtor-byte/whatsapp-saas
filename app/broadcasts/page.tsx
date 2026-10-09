import AppShell from '@/components/AppShell';
import BroadcastsClient from '@/components/BroadcastsClient';
import { getBroadcastCampaigns } from '@/lib/data';

export default async function BroadcastsPage() {
  const campaigns = await getBroadcastCampaigns();

  return (
    <AppShell>
      <BroadcastsClient campaigns={campaigns} />
    </AppShell>
  );
}
