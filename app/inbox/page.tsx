import AppShell from '@/components/AppShell';
import InboxClient from '@/components/InboxClient';

export default function InboxPage() {
  const configured = process.env.GREEN_API_EMBEDDED_CHATS_URL?.trim() || null;
  const embeddedUrl =
    configured &&
    configured.startsWith('https://') &&
    !configured.toLowerCase().includes('apitokeninstance')
      ? configured
      : null;

  return (
    <AppShell>
      <InboxClient embeddedUrl={embeddedUrl} />
    </AppShell>
  );
}
