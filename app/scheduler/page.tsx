import AppShell from '@/components/AppShell';
import FeatureLocked from '@/components/FeatureLocked';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';
import SchedulerClient from '@/components/SchedulerClient';
import { getScheduledMessages } from '@/lib/data';

export default async function SchedulerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const entitlements = await getFeatureEntitlements(user.id);
  if (!entitlements.scheduler.enabled) {
    return (
      <AppShell>
        <FeatureLocked feature="scheduler" />
      </AppShell>
    );
  }

  const messages = await getScheduledMessages();

  return (
    <AppShell>
      <SchedulerClient messages={messages} />
    </AppShell>
  );
}
