import AppShell from '@/components/AppShell';
import PublisherClient from '@/components/PublisherClient';
import { getCampaigns, getCampaignDeliveryStats, getWhatsAppGroups } from '@/lib/data';

export default async function PublisherPage() {
  const [campaigns, groups, deliveryStats] = await Promise.all([
    getCampaigns(),
    getWhatsAppGroups(),
    getCampaignDeliveryStats(),
  ]);

  return (
    <AppShell>
      <PublisherClient campaigns={campaigns} groups={groups} deliveryStats={deliveryStats} />
    </AppShell>
  );
}
