import AppShell from '@/components/AppShell';
import SchedulerClient from '@/components/SchedulerClient';
import { getScheduledMessages } from '@/lib/data';

export default async function SchedulerPage() {
  const messages = await getScheduledMessages();

  return (
    <AppShell>
      <SchedulerClient messages={messages} />
    </AppShell>
  );
}
