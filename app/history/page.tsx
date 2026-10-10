import AppShell from '@/components/AppShell';
import HistoryClient from '@/components/HistoryClient';
import { getDeliveryHistory } from '@/lib/data';

export default async function HistoryPage() {
  const items = await getDeliveryHistory();

  return (
    <AppShell>
      <HistoryClient items={items} />
    </AppShell>
  );
}
