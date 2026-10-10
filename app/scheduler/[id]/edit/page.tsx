import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EditScheduledMessageForm from '@/components/EditScheduledMessageForm';
import { getScheduledMessageById } from '@/lib/data';

export default async function EditScheduledMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let message;
  try {
    message = await getScheduledMessageById(id);
  } catch {
    notFound();
  }

  if (message.status !== 'pending') {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-black">עריכת הודעה מתוזמנת</h1>
          <p className="mt-1 text-slate-500">אפשר לשנות יעד, תוכן וזמן כל עוד ההודעה עדיין ממתינה.</p>
        </div>
        <EditScheduledMessageForm message={message} />
      </div>
    </AppShell>
  );
}
