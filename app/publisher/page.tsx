import AppShell from '@/components/AppShell';
import FeatureLocked from '@/components/FeatureLocked';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';
import PublisherClient from '@/components/PublisherClient';
import { getCampaigns, getCampaignDeliveryStats, getWhatsAppGroups } from '@/lib/data';

export default async function PublisherPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const entitlements = await getFeatureEntitlements(user.id);
  if (!entitlements.group_publisher.enabled) {
    return (
      <AppShell>
        <FeatureLocked feature="group_publisher" />
      </AppShell>
    );
  }

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
