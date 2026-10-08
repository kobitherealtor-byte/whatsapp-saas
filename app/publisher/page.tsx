import AppShell from '@/components/AppShell';
import PublisherClient from '@/components/PublisherClient';
import { getCampaigns, getWhatsAppGroups } from '@/lib/data';

export default async function PublisherPage() {
  const [campaigns, groups] = await Promise.all([
    getCampaigns(),
    getWhatsAppGroups(),
  ]);

  return (
    <AppShell>
      <PublisherClient campaigns={campaigns} groups={groups} />
    </AppShell>
  );
}
