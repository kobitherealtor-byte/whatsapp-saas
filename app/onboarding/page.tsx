import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    profileResult,
    connectionResult,
    groupsResult,
    messagesResult,
    broadcastsResult,
    campaignsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('business_name').eq('id', user.id).maybeSingle(),
    supabase.from('whatsapp_connections').select('status, phone_number').eq('user_id', user.id).maybeSingle(),
    supabase.from('whatsapp_groups').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true).eq('user_enabled', true),
    supabase.from('scheduled_messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('broadcast_campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('group_campaigns').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const businessReady = Boolean(profileResult.data?.business_name?.trim());
  const whatsappReady = connectionResult.data?.status === 'connected';
  const groupsReady = (groupsResult.count ?? 0) > 0;
  const firstAutomationReady =
    (messagesResult.count ?? 0) > 0 ||
    (broadcastsResult.count ?? 0) > 0 ||
    (campaignsResult.count ?? 0) > 0;

  const states = {
    businessReady,
    whatsappReady,
    groupsReady,
    firstAutomationReady,
  };

  const completedCount = Object.values(states).filter(Boolean).length;
  const progress = Math.round((completedCount / 4) * 100);

  const steps = [
    {
      key: 'businessReady' as const,
      number: '1',
      title: 'פרטי העסק',
      description: 'שם העסק והפרטים שיופיעו בסביבת העבודה.',
      href: '/account',
      action: 'הגדר פרטי עסק',
    },
    {
      key: 'whatsappReady' as const,
      number: '2',
      title: 'חיבור WhatsApp',
      description: 'סריקת QR וחיבור המספר שישלח בפועל.',
      href: '/settings',
      action: 'חבר WhatsApp',
    },
    {
      key: 'groupsReady' as const,
      number: '3',
      title: 'סנכרון קבוצות',
      description: 'טען את קבוצות WhatsApp ובחר אילו מהן זמינות לפרסום.',
      href: '/groups',
      action: 'נהל קבוצות',
    },
    {
      key: 'firstAutomationReady' as const,
      number: '4',
      title: 'יצירת שליחה ראשונה',
      description: 'תזמן הודעה, צור תפוצה או קמפיין פרסום לקבוצות.',
      href: '/scheduler/new',
      action: 'צור שליחה ראשונה',
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Getting started</p>
          <h1 className="mt-1 text-3xl font-black">הקמת החשבון</h1>
          <p className="mt-2 text-slate-500">
            ארבעה צעדים קצרים עד שהמערכת מוכנה לעבודה יומיומית.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{completedCount} מתוך 4 הושלמו</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
              החשבון מוכן. אפשר להתחיל לעבוד מהממשק הרגיל.
            </div>
          )}
        </section>

        <div className="space-y-4">
          {steps.map((step) => {
            const done = states[step.key];

            return (
              <article
                key={step.key}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  done ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black ${
                        done
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {done ? '✓' : step.number}
                    </div>
                    <div>
                      <h2 className="font-black">{step.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {step.description}
                      </p>
                      {step.key === 'whatsappReady' && connectionResult.data?.phone_number && (
                        <div className="mt-1 text-xs font-semibold text-emerald-700">
                          מספר מחובר: {connectionResult.data.phone_number}
                        </div>
                      )}
                      {step.key === 'groupsReady' && (groupsResult.count ?? 0) > 0 && (
                        <div className="mt-1 text-xs font-semibold text-emerald-700">
                          {groupsResult.count} קבוצות זמינות
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    href={step.href}
                    className={`rounded-xl px-4 py-2.5 text-center text-sm font-bold ${
                      done
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {done ? 'בדוק / ערוך' : step.action}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/scheduler/new" className="rounded-2xl border border-slate-200 bg-white p-4 text-center font-bold hover:bg-slate-50">
            הודעה אישית
          </Link>
          <Link href="/broadcasts/new" className="rounded-2xl border border-slate-200 bg-white p-4 text-center font-bold hover:bg-slate-50">
            קמפיין תפוצה
          </Link>
          <Link href="/publisher/new" className="rounded-2xl border border-slate-200 bg-white p-4 text-center font-bold hover:bg-slate-50">
            פרסום לקבוצות
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
