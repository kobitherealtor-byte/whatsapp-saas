import AppShell from '@/components/AppShell';
import FeatureLocked from '@/components/FeatureLocked';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';
import BroadcastsClient from '@/components/BroadcastsClient';
import { getBroadcastCampaigns } from '@/lib/data';

export default async function BroadcastsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const entitlements = await getFeatureEntitlements(user.id);
  if (!entitlements.broadcasts.enabled) {
    return (
      <AppShell>
        <FeatureLocked feature="broadcasts" />
      </AppShell>
    );
  }

  const campaigns = await getBroadcastCampaigns();

  return (
    <AppShell>
      <BroadcastsClient campaigns={campaigns} />
    </AppShell>
  );
}
