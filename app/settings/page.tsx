'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';

export default function SettingsPage() {
  const [status, setStatus] = useState<'disconnected' | 'creating' | 'waiting_for_qr' | 'connected'>('disconnected');

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6"><h1 className="text-3xl font-black">חיבור WhatsApp</h1><p className="mt-1 text-slate-500">חיבור פשוט דרך QR — בלי מפתחות, טוקנים או מסכים טכניים.</p></div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {status === 'disconnected' && <div className="text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-2xl">◌</div><h2 className="text-xl font-extrabold">WhatsApp עדיין לא מחובר</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">לחץ על הכפתור. המערכת תכין חיבור ייעודי ותציג QR לסריקה.</p><button onClick={() => setStatus('creating')} className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 sm:w-auto">חבר WhatsApp</button></div>}
          {status === 'creating' && <div className="py-10 text-center"><div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" /><h2 className="font-extrabold">מכין חיבור מאובטח...</h2><p className="mt-2 text-sm text-slate-500">בגרסה המחוברת, השרת ייצור חיבור ויחזיר QR.</p><button onClick={() => setStatus('waiting_for_qr')} className="mt-5 text-xs font-bold text-slate-400 underline">המשך להדמיית QR</button></div>}
          {status === 'waiting_for_qr' && <div className="text-center"><h2 className="text-xl font-extrabold">סרוק את הקוד מהטלפון</h2><p className="mt-2 text-sm text-slate-500">WhatsApp → מכשירים מקושרים → קישור מכשיר</p><div className="mx-auto my-6 flex aspect-square w-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-400">QR דינמי יופיע כאן</div><div className="text-xs font-semibold text-amber-700">ממתין לסריקה...</div><button onClick={() => setStatus('connected')} className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">הדמיית חיבור מוצלח</button></div>}
          {status === 'connected' && <div className="text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✓</div><h2 className="text-xl font-extrabold text-emerald-900">WhatsApp מחובר</h2><p className="mt-2 text-sm text-slate-500">החיבור פעיל ומוכן לשימוש.</p><div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-right text-sm text-emerald-900"><div className="font-bold">הכל מוכן</div><div className="mt-1 text-emerald-700">אפשר לתזמן הודעות ולהפעיל קמפיינים לקבוצות.</div></div><button onClick={() => setStatus('disconnected')} className="mt-6 text-sm font-bold text-red-600 hover:underline">נתק WhatsApp</button></div>}
        </section>
      </div>
    </AppShell>
  );
}