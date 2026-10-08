import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { groupCampaigns } from '@/lib/mock-data';

export default function PublisherPage() {
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
          {[["2", "קמפיינים פעילים"], ["11", "קבוצות זמינות"], ["18", "פרסומים השבוע"]].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-black">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>
          ))}
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.5fr_.6fr_1fr_1fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid"><div>קמפיין</div><div>קבוצות</div><div>תזמון</div><div>הרצה הבאה</div><div>סטטוס</div></div>
          <div className="divide-y divide-slate-100">
            {groupCampaigns.map((campaign) => (
              <div key={campaign.id} className="grid gap-3 p-5 md:grid-cols-[1.5fr_.6fr_1fr_1fr_.8fr] md:items-center">
                <div><div className="font-bold">{campaign.name}</div><div className="mt-1 text-xs text-slate-400">לחץ לעריכה, השהיה או שכפול</div></div>
                <div className="text-sm font-bold">{campaign.groups}</div>
                <div className="text-sm text-slate-600">{campaign.schedule}</div>
                <div className="text-sm text-slate-600">{campaign.nextRun}</div>
                <div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${campaign.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{campaign.status === 'active' ? 'פעיל' : 'מושהה'}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}