import AppShell from '@/components/AppShell';
import AlertsClient from '@/components/AlertsClient';
import { createClient } from '@/lib/supabase/server';
import { getAccountAlerts, refreshAccountAlerts } from '@/lib/alerts';

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await refreshAccountAlerts(user.id);
  const alerts = await getAccountAlerts(user.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Monitoring</p>
          <h1 className="mt-1 text-3xl font-black">התראות</h1>
          <p className="mt-2 text-slate-500">
            חיבור WhatsApp, תקלות שליחה, שימוש בחבילה ומצב החיוב.
          </p>
        </header>

        <AlertsClient alerts={alerts} />
      </div>
    </AppShell>
  );
}
