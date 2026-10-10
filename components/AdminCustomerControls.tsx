'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  setCustomerSuspended,
  updateCustomerAccount,
} from '@/app/actions/admin';

export default function AdminCustomerControls({
  customerId,
  initial,
}: {
  customerId: string;
  initial: {
    planCode: string;
    billingStatus: string;
    monthlySendLimit: number;
    maxPendingMessages: number;
    maxActiveCampaigns: number;
    maxGroupsPerCampaign: number;
    maxBroadcastRecipients: number;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateCustomerAccount(customerId, form);
      setMessage('הגדרות החשבון עודכנו.');
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'שמירת ההגדרות נכשלה.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspended = async () => {
    const suspend = !['cancelled', 'past_due'].includes(form.billingStatus);
    const prompt = suspend
      ? 'להשהות את החשבון? השליחות ייחסמו עד להפעלה מחדש.'
      : 'להפעיל מחדש את החשבון?';

    if (!window.confirm(prompt)) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await setCustomerSuspended(customerId, suspend);
      const next = suspend ? 'cancelled' : 'beta';
      setForm((current) => ({ ...current, billingStatus: next }));
      setMessage(suspend ? 'החשבון הושהה.' : 'החשבון הופעל מחדש.');
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'עדכון סטטוס החשבון נכשל.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">תוכנית ומגבלות</h2>
          <p className="mt-1 text-xs text-slate-500">
            השינויים כאן משפיעים ישירות על יכולת השליחה של הלקוח.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void toggleSuspended()}
          className={
            ['cancelled', 'past_due'].includes(form.billingStatus)
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50'
              : 'rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50'
          }
        >
          {['cancelled', 'past_due'].includes(form.billingStatus)
            ? 'הפעל מחדש'
            : 'השהה חשבון'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Plan
          <input
            value={form.planCode}
            onChange={(event) =>
              setForm({ ...form, planCode: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
          />
        </label>

        <label className="text-sm font-bold text-slate-700">
          Billing Status
          <select
            value={form.billingStatus}
            onChange={(event) =>
              setForm({ ...form, billingStatus: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal"
          >
            <option value="beta">Beta</option>
            <option value="trialing">Trialing</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        {[
          ['monthlySendLimit', 'מגבלת שליחות חודשית'],
          ['maxPendingMessages', 'הודעות פעילות'],
          ['maxActiveCampaigns', 'קמפיינים פעילים'],
          ['maxGroupsPerCampaign', 'קבוצות בקמפיין'],
          ['maxBroadcastRecipients', 'נמענים בקמפיין תפוצה'],
        ].map(([key, label]) => (
          <label key={key} className="text-sm font-bold text-slate-700">
            {label}
            <input
              type="number"
              min={1}
              value={form[key as keyof typeof form] as number}
              onChange={(event) =>
                setForm({
                  ...form,
                  [key]: Number(event.target.value),
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
      >
        {saving ? 'שומר...' : 'שמור הגדרות'}
      </button>
    </section>
  );
}
