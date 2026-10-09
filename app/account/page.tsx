import AppShell from '@/components/AppShell';
import AccountForm from '@/components/AccountForm';
import { createClient } from '@/lib/supabase/server';
import { getAccountLimits, getAccountUsage } from '@/lib/account-limits';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, limits, usage] = await Promise.all([
    supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .maybeSingle(),
    getAccountLimits(user.id),
    getAccountUsage(user.id),
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl pb-20 lg:pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-black">החשבון שלי</h1>
          <p className="mt-1 text-slate-500">פרטים בסיסיים של סביבת העבודה שלך.</p>
        </div>
        <AccountForm
          email={user.email ?? ''}
          businessName={profile?.business_name ?? ''}
        />

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-500">תוכנית נוכחית</div>
              <div className="mt-1 text-xl font-black">{limits.planCode === 'beta' ? 'Beta' : limits.planCode}</div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {limits.billingStatus === 'beta' ? 'גישה מלאה לבטא' : limits.billingStatus}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-black">{usage.pendingMessages} / {limits.maxPendingMessages}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">הודעות פעילות</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-black">{usage.activeCampaigns} / {limits.maxActiveCampaigns}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">קמפיינים פעילים</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-black">{limits.maxBroadcastRecipients}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">נמענים בקמפיין תפוצה</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-black">{usage.sentThisPeriod} / {limits.monthlySendLimit}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">שליחות בתקופה</div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            התמחור הסופי עדיין לא הופעל. שכבת המגבלות כבר מוכנה כדי שנוכל לחבר מערכת חיוב בלי לשנות את מנגנון השליחה.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
