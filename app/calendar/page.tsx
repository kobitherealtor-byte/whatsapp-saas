import AppShell from '@/components/AppShell';
import CalendarClient from '@/components/CalendarClient';
import { getCalendarEvents } from '@/lib/data';

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  return (
    <AppShell>
      <CalendarClient events={events} />
    </AppShell>
  );
}
