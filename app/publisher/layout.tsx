import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import FeatureLocked from '@/components/FeatureLocked';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';

export default async function PublisherLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const entitlements = await getFeatureEntitlements(user.id);
  if (!entitlements.group_publisher.enabled) {
    return (
      <AppShell>
        <FeatureLocked feature="group_publisher" />
      </AppShell>
    );
  }

  return children;
}
