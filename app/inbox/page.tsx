import AppShell from '@/components/AppShell';
import InboxClient from '@/components/InboxClient';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const entitlements = await getFeatureEntitlements(user.id);
  const configured = process.env.GREEN_API_EMBEDDED_CHATS_URL?.trim() || null;
  const embeddedUrl =
    configured &&
    configured.startsWith('https://') &&
    !configured.toLowerCase().includes('apitokeninstance')
      ? configured
      : null;

  return (
    <AppShell>
      <InboxClient
        embeddedUrl={entitlements.embedded_inbox.enabled ? embeddedUrl : null}
        embeddedAllowed={entitlements.embedded_inbox.enabled}
      />
    </AppShell>
  );
}
