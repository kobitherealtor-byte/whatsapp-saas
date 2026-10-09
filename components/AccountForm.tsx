'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateBusinessProfile } from '@/app/actions/account';

export default function AccountForm({
  email,
  businessName,
}: {
  email: string;
  businessName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(businessName);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setNotice('');
    setError('');

    try {
      await updateBusinessProfile({ businessName: name });
      setNotice('פרטי החשבון נשמרו.');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'שמירת הפרטים נכשלה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}

      <label className="block text-sm font-bold text-slate-700">
        אימייל
        <input value={email} disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-normal text-slate-500" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        שם העסק
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="לדוגמה: העסק שלי"
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
        />
      </label>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        אזור הזמן במערכת מוגדר לישראל (Asia/Jerusalem) כדי לשמור על שעות שליחה נכונות גם במעבר שעון קיץ/חורף.
      </div>

      <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
        {loading ? 'שומר...' : 'שמור פרטים'}
      </button>
    </form>
  );
}
