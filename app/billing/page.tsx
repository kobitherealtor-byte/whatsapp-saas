import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getAccountLimits, getAccountUsage } from '@/lib/account-limits';
import { getFeatureEntitlements } from '@/lib/features';
import { FEATURE_KEYS, FEATURE_LABELS } from '@/lib/feature-definitions';

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [limits, usage, entitlements] = await Promise.all([
    getAccountLimits(user.id),
    getAccountUsage(user.id),
    getFeatureEntitlements(user.id),
  ]);

  const sentPercent = Math.min(
    100,
    Math.round((usage.sentThisPeriod / Math.max(1, limits.monthlySendLimit)) * 100),
  );

  const statusLabel =
    limits.billingStatus === 'beta'
      ? 'Beta'
      : limits.billingStatus === 'trialing'
        ? 'תקופת ניסיון'
        : limits.billingStatus === 'active'
          ? 'פעיל'
          : limits.billingStatus === 'past_due'
            ? 'נדרש טיפול בתשלום'
            : 'לא פעיל';

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Billing & Plan</p>
          <h1 className="mt-1 text-3xl font-black">תוכנית ושימוש</h1>
          <p className="mt-2 text-slate-500">
            התשתית מוכנה לחיוב מסחרי. עד לבחירת ספק סליקה, החשבון נשאר במצב Beta.
          </p>
        </header>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold text-slate-500">תוכנית נוכחית</div>
              <div className="mt-1 text-3xl font-black">
                {limits.planCode === 'beta' ? 'Beta' : limits.planCode}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                ['beta', 'trialing', 'active'].includes(limits.billingStatus)
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>שליחות בתקופה</span>
              <span>{usage.sentThisPeriod} / {limits.monthlySendLimit}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${sentPercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {[
            [limits.maxPendingMessages, 'הודעות פעילות'],
            [limits.maxActiveCampaigns, 'קמפיינים פעילים'],
            [limits.maxGroupsPerCampaign, 'קבוצות בקמפיין'],
            [limits.maxBroadcastRecipients, 'נמענים בקמפיין תפוצה'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">מה פעיל בחשבון</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FEATURE_KEYS.map((key) => {
              const feature = entitlements[key];
              return (
                <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <div className="font-bold">{FEATURE_LABELS[key]}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {feature.source === 'plan'
                        ? 'לפי החבילה'
                        : feature.source === 'billing'
                          ? 'תוספת שנרכשה'
                          : feature.source === 'admin'
                            ? 'הוגדר ידנית'
                            : 'הגדרת מערכת'}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${feature.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {feature.enabled ? 'פעיל' : 'לא כלול'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-950">התמחור המסחרי עדיין לא הופעל</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            לא נציג מחירים או כפתור תשלום לפני שנבחר ספק סליקה ונחליט על החבילות הסופיות.
            שכבת ה-Billing, המגבלות וסטטוס החשבון כבר מחוברות למנוע השליחה.
          </p>
        </section>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            החשבון שלי
          </Link>
          <Link href="/onboarding" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            הקמת החשבון
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
