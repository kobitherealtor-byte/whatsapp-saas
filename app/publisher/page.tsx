import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getCampaigns, getWhatsAppGroups } from '@/lib/data';

const dayLabels = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function formatNextRun(value: string | null) {
  if (!value) return 'טרם חושב';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(value));
}

export default async function PublisherPage() {
  const [campaigns, groups] = await Promise.all([getCampaigns(), getWhatsAppGroups()]);
  const activeCount = campaigns.filter((campaign) => campaign.status === 'active').length;

  return (
    <AppShell>
      <div className="pb-20 lg:pb-0">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">פרסום לקבוצות</h1>
            <p className="mt-1 text-slate-500">קמפיינים קבועים לקבוצות WhatsApp לפי ימים ושעות.</p>
          </div>
          <Link href="/publisher/new" className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">+ קמפיין חדש</Link>
        </header>

        <section className="mb-5 grid gap-4 md:grid-cols-3">
          {[[String(activeCount), 'קמפיינים פעילים'], [String(groups.length), 'קבוצות זמינות'], [String(campaigns.length), 'סה״כ קמפיינים']].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.5fr_.6fr_1fr_1fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
            <div>קמפיין</div><div>קבוצות</div><div>תזמון</div><div>הרצה הבאה</div><div>סטטוס</div>
          </div>
          <div className="divide-y divide-slate-100">
            {campaigns.map((campaign) => {
              const groupCount = campaign.campaign_groups?.length ?? 0;
              const schedule = campaign.days_of_week.length
                ? `${campaign.days_of_week.map((day) => dayLabels[day] ?? day).join(', ')} · ${campaign.send_time.slice(0, 5)}`
                : `ללא ימים · ${campaign.send_time.slice(0, 5)}`;

              return (
                <div key={campaign.id} className="grid gap-3 p-5 md:grid-cols-[1.5fr_.6fr_1fr_1fr_.8fr] md:items-center">
                  <div>
                    <div className="font-bold">{campaign.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{campaign.message_body}</div>
                  </div>
                  <div className="text-sm font-bold">{groupCount}</div>
                  <div className="text-sm text-slate-600">{schedule}</div>
                  <div className="text-sm text-slate-600">{formatNextRun(campaign.next_run_at)}</div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      campaign.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : campaign.status === 'paused'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {campaign.status === 'active' ? 'פעיל' : campaign.status === 'paused' ? 'מושהה' : campaign.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {campaigns.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">
                עדיין לא נוצרו קמפיינים.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
