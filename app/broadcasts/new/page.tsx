import AppShell from '@/components/AppShell';
import NewBroadcastForm from '@/components/NewBroadcastForm';

export default function NewBroadcastPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Broadcast Campaign</p>
          <h1 className="mt-1 text-3xl font-black">קמפיין תפוצה חדש</h1>
          <p className="mt-2 text-slate-500">
            הוסף נמענים, כתוב הודעה וקבע את קצב השליחה.
          </p>
        </header>
        <NewBroadcastForm />
      </div>
    </AppShell>
  );
}
