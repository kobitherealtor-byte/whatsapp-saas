'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCustomerFeatureOverride } from '@/app/actions/admin';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureEntitlement,
  type FeatureKey,
} from '@/lib/feature-definitions';

type Mode = 'inherit' | 'enabled' | 'disabled';

function modeFromEntitlement(entitlement: FeatureEntitlement): Mode {
  if (entitlement.source !== 'admin') return 'inherit';
  return entitlement.enabled ? 'enabled' : 'disabled';
}

export default function AdminFeatureControls({
  customerId,
  entitlements,
}: {
  customerId: string;
  entitlements: Record<FeatureKey, FeatureEntitlement>;
}) {
  const router = useRouter();
  const [modes, setModes] = useState<Record<FeatureKey, Mode>>(
    Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, modeFromEntitlement(entitlements[key])]),
    ) as Record<FeatureKey, Mode>,
  );
  const [busyKey, setBusyKey] = useState<FeatureKey | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (featureKey: FeatureKey, mode: Mode) => {
    setBusyKey(featureKey);
    setError('');
    setMessage('');

    try {
      await setCustomerFeatureOverride(customerId, featureKey, mode);
      setModes((current) => ({ ...current, [featureKey]: mode }));
      setMessage('הרשאת הפיצ׳ר עודכנה.');
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'עדכון הרשאת הפיצ׳ר נכשל.',
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black">פיצ׳רים והרשאות</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          ברירת המחדל מגיעה מהחבילה. אפשר לתת או להסיר פיצ׳ר ידנית ללקוח ספציפי.
          בהמשך רכישת תוספת בתשלום תוכל להפעיל אותו אוטומטית דרך Billing.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {FEATURE_KEYS.map((key) => {
          const entitlement = entitlements[key];
          const mode = modes[key];
          const inheritedSource =
            entitlement.source === 'billing'
              ? 'תוספת שנרכשה'
              : entitlement.planEnabled
                ? 'כלול בחבילה'
                : 'לא כלול בחבילה';

          return (
            <div
              key={key}
              className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-bold">{FEATURE_LABELS[key]}</div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      entitlement.enabled
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {entitlement.enabled ? 'פעיל' : 'כבוי'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {mode === 'inherit'
                    ? `אוטומטי: ${inheritedSource}`
                    : mode === 'enabled'
                      ? 'אושר ידנית על ידי Admin'
                      : 'הוסר ידנית על ידי Admin'}
                </div>
              </div>

              <select
                value={mode}
                disabled={busyKey === key}
                onChange={(event) =>
                  void change(key, event.target.value as Mode)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50"
              >
                <option value="inherit">אוטומטי לפי חבילה</option>
                <option value="enabled">אשר ידנית</option>
                <option value="disabled">הסר ידנית</option>
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
