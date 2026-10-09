'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      setReady(true);
    };

    void check();
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      router.replace('/dashboard');
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'עדכון הסיסמה נכשל.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-sm font-bold text-slate-500">מאמת את קישור האיפוס...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-right" dir="rtl">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <form onSubmit={submit} className="w-full space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div>
            <h1 className="text-3xl font-black">סיסמה חדשה</h1>
            <p className="mt-2 text-sm text-slate-500">בחר סיסמה חדשה לחשבון שלך.</p>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          <label className="block text-sm font-bold text-slate-700">
            סיסמה חדשה
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            אימות סיסמה
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-emerald-500"
            />
          </label>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
          </button>
        </form>
      </div>
    </div>
  );
}
