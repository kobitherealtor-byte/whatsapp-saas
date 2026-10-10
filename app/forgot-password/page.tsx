'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) throw resetError;

      setNotice('אם קיים חשבון עם האימייל הזה, שלחנו אליו קישור לאיפוס הסיסמה.');
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'לא הצלחנו לשלוח קישור לאיפוס הסיסמה.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-right" dir="rtl">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link href="/login" className="text-sm font-bold text-emerald-700 hover:underline">← חזרה להתחברות</Link>
          <h1 className="mt-6 text-3xl font-black">איפוס סיסמה</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">הכנס את כתובת האימייל שלך ונשלח קישור מאובטח לבחירת סיסמה חדשה.</p>

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              אימייל
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-emerald-500"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
