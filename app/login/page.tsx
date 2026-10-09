'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'האימייל או הסיסמה אינם נכונים.';
  if (normalized.includes('email not confirmed')) return 'צריך לאשר את כתובת האימייל לפני ההתחברות.';
  if (normalized.includes('user already registered')) return 'כבר קיים חשבון עם כתובת האימייל הזאת.';
  if (normalized.includes('password')) return 'הסיסמה צריכה להכיל לפחות 6 תווים.';
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [nextPath, setNextPath] = useState('/dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next?.startsWith('/')) setNextPath(next);

    const reason = params.get('error');
    if (reason === 'supabase_not_configured') {
      setError('Supabase עדיין לא מוגדר בסביבת ההרצה.');
    } else if (reason === 'auth_callback_failed') {
      setError('אישור החשבון לא הושלם. אפשר לנסות להתחבר שוב.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!configured) {
      setError('חסרים משתני Supabase. צריך להוסיף אותם ב-Vercel או בקובץ .env.local.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace('/dashboard');
          router.refresh();
          return;
        }

        setNotice('החשבון נוצר. שלחנו אליך אימייל לאישור הכתובת.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.replace(nextPath);
        router.refresh();
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'אירעה שגיאה בהתחברות.';
      setError(friendlyAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-right" dir="rtl">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_1.05fr]">
          <section className="hidden bg-slate-950 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <div className="inline-flex rounded-2xl bg-emerald-500 px-3 py-1 text-xs font-black text-slate-950">WhatsApp Plus</div>
              <h1 className="mt-6 text-4xl font-black leading-tight">התזמונים והקבוצות שלך. בלי להיכנס ל-Make.</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">Scheduler להודעות אישיות ו-Group Publisher לפרסום מסודר בקבוצות WhatsApp.</p>
            </div>
            <p className="text-xs text-slate-500">כל משתמש מקבל סביבת עבודה פרטית ונפרדת.</p>
          </section>

          <section className="p-6 sm:p-10">
            <Link href="/" className="text-sm font-bold text-emerald-700 hover:underline">← חזרה</Link>

            <div className="mt-8">
              <h2 className="text-3xl font-black">{isRegister ? 'פתיחת חשבון' : 'כניסה למערכת'}</h2>
              <p className="mt-2 text-sm text-slate-500">{isRegister ? 'צור חשבון והתחל להגדיר את ה-WhatsApp שלך.' : 'התחבר כדי לנהל הודעות וקמפיינים.'}</p>
            </div>

            {!configured && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Supabase עדיין לא מחובר לסביבה הזאת.
              </div>
            )}

            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                אימייל
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-emerald-500"
                  disabled={loading}
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                סיסמה
                <input
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-emerald-500"
                  disabled={loading}
                />
              </label>

              {!isRegister && (
                <div className="text-left">
                  <Link href="/forgot-password" className="text-xs font-bold text-emerald-700 hover:underline">
                    שכחת סיסמה?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !configured}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'רגע...' : isRegister ? 'צור חשבון' : 'התחבר'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
              {isRegister ? 'כבר יש לך חשבון?' : 'עדיין אין לך חשבון?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister((value) => !value);
                  setError('');
                  setNotice('');
                }}
                className="font-black text-emerald-700 hover:underline"
              >
                {isRegister ? 'התחבר' : 'פתח חשבון'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
