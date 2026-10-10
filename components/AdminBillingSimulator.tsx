'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { simulateBillingEvent } from '@/app/actions/admin';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
} from '@/lib/feature-definitions';

type Plan = {
  planCode: string;
  displayName: string;
  isActive: boolean;
  features: Record<string, boolean>;
};

export default function AdminBillingSimulator({
  customerId,
  plans,
  currentPlan,
  currentStatus,
}: {
  customerId: string;
  plans: Plan[];
  currentPlan: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
  const [planCode, setPlanCode] = useState(currentPlan);
  const [billingStatus, setBillingStatus] = useState(
    ['beta', 'trialing', 'active', 'past_due', 'cancelled'].includes(currentStatus)
      ? currentStatus
      : 'active',
  );
  const [addons, setAddons] = useState<FeatureKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlan = activePlans.find((plan) => plan.planCode === planCode);
  const optionalFeatures = FEATURE_KEYS.filter(
    (key) => !selectedPlan?.features[key],
  );

  const toggleAddon = (key: FeatureKey) => {
    setAddons((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black">Billing Simulator</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          מדמה אירוע אמיתי מספק סליקה: שיוך חבילה, סטטוס חיוב ותוספים שנרכשו.
          כשהסליקה האמיתית תחובר, היא תשתמש באותו מנגנון.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          חבילה
          <select
            value={planCode}
            onChange={(event) => {
              setPlanCode(event.target.value);
              setAddons([]);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal"
          >
            {activePlans.map((plan) => (
              <option key={plan.planCode} value={plan.planCode}>
                {plan.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-slate-700">
          Billing Status
          <select
            value={billingStatus}
            onChange={(event) => setBillingStatus(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal"
          >
            <option value="beta">Beta</option>
            <option value="trialing">Trialing</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {optionalFeatures.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-black">תוספים בתשלום</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {optionalFeatures.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <span className="text-sm font-bold">{FEATURE_LABELS[key]}</span>
                <input
                  type="checkbox"
                  checked={addons.includes(key)}
                  onChange={() => toggleAddon(key)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={busy || !planCode}
        onClick={async () => {
          setBusy(true);
          setError('');
          setMessage('');
          try {
            const result = await simulateBillingEvent({
              customerId,
              planCode,
              billingStatus: billingStatus as
                | 'beta'
                | 'trialing'
                | 'active'
                | 'past_due'
                | 'cancelled',
              enabledAddons: addons,
            });
            setMessage('אירוע Billing עובד בהצלחה. Event: ' + result.eventId);
            router.refresh();
          } catch (actionError) {
            setError(
              actionError instanceof Error
                ? actionError.message
                : 'הדמיית Billing נכשלה.',
            );
          } finally {
            setBusy(false);
          }
        }}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'מריץ בדיקה...' : 'הפעל אירוע Billing מדומה'}
      </button>
    </section>
  );
}
