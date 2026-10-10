import AppShell from '@/components/AppShell';
import GroupsClient from '@/components/GroupsClient';
import { getWhatsAppGroupsForManagement } from '@/lib/data';

export default async function GroupsPage() {
  const groups = await getWhatsAppGroupsForManagement();

  return (
    <AppShell>
      <GroupsClient groups={groups} />
    </AppShell>
  );
}
