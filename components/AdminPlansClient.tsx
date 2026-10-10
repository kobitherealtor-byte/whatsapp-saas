'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePlanDefinition } from '@/app/actions/admin';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
} from '@/lib/feature-definitions';

type PlanRow = {
  planCode: string;
  displayName: string;
  maxPendingMessages: number;
  maxActiveCampaigns: number;
  maxGroupsPerCampaign: number;
  maxBroadcastRecipients: number;
  monthlySendLimit: number;
  isActive: boolean;
  features: Record<string, boolean>;
};

export default function AdminPlansClient({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState(plans[0]?.planCode ?? 'beta');
  const selected = useMemo(
    () => plans.find((plan) => plan.planCode === selectedCode) ?? plans[0],
    [plans, selectedCode],
  );

  const [draft, setDraft] = useState<PlanRow>(
    selected ?? {
      planCode: 'beta',
      displayName: 'Beta',
      maxPendingMessages: 500,
      maxActiveCampaigns: 50,
      maxGroupsPerCampaign: 100,
      maxBroadcastRecipients: 2000,
      monthlySendLimit: 10000,
      isActive: true,
      features: Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])),
    },
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const choosePlan = (code: string) => {
    setSelectedCode(code);
    const plan = plans.find((item) => item.planCode === code);
    if (plan) setDraft(plan);
    setMessage('');
    setError('');
  };

  const createNew = () => {
    setSelectedCode('');
    setDraft({
      planCode: '',
      displayName: '',
      maxPendingMessages: 100,
      maxActiveCampaigns: 10,
      maxGroupsPerCampaign: 25,
      maxBroadcastRecipients: 500,
      monthlySendLimit: 2000,
      isActive: true,
      features: Object.fromEntries(FEATURE_KEYS.map((key) => [key, false])),
    });
    setMessage('');
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await savePlanDefinition({
        ...draft,
        features: draft.features as Partial<Record<FeatureKey, boolean>>,
      });
      setMessage('החבילה נשמרה.');
      setSelectedCode(draft.planCode);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'שמירת החבילה נכשלה.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">חבילות</h2>
          <button type="button" onClick={createNew} className="text-xs font-bold text-emerald-700">
            + חדשה
          </button>
        </div>
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              type="button"
              key={plan.planCode}
              onClick={() => choosePlan(plan.planCode)}
              className={`w-full rounded-xl px-3 py-3 text-right ${
                selectedCode === plan.planCode
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold">{plan.displayName}</div>
              <div className="mt-1 text-xs opacity-70">{plan.planCode}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-black">הגדרת חבילה</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            הלקוח יקבל את הפיצ׳רים והמגבלות האלה אוטומטית כאשר Billing ישייך אותו לחבילה.
            Override ידני ברמת הלקוח עדיין גובר על החבילה.
          </p>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            קוד חבילה
            <input
              value={draft.planCode}
              disabled={Boolean(selectedCode)}
              onChange={(event) => setDraft({ ...draft, planCode: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal disabled:bg-slate-100"
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            שם תצוגה
            <input
              value={draft.displayName}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
            />
          </label>

          {([
            ['monthlySendLimit', 'שליחות חודשיות'],
            ['maxPendingMessages', 'הודעות פעילות'],
            ['maxActiveCampaigns', 'קמפיינים פעילים'],
            ['maxGroupsPerCampaign', 'קבוצות בקמפיין'],
            ['maxBroadcastRecipients', 'נמענים בקמפיין תפוצה'],
          ] as const).map(([key, label]) => (
            <label key={key} className="text-sm font-bold text-slate-700">
              {label}
              <input
                type="number"
                min={1}
                value={draft[key]}
                onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
              />
            </label>
          ))}

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            />
            החבילה זמינה לשיוך
          </label>
        </div>

        <div className="mt-6">
          <h3 className="font-black">פיצ׳רים כלולים</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FEATURE_KEYS.map((key) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <span className="text-sm font-bold">{FEATURE_LABELS[key]}</span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.features[key])}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      features: { ...draft.features, [key]: event.target.checked },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {saving ? 'שומר...' : 'שמור חבילה'}
        </button>
      </section>
    </div>
  );
}
