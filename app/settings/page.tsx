'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [status, setStatus] = useState<'disconnected' | 'creating' | 'waiting_for_qr' | 'connected'>('disconnected');

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-right" dir="rtl">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-sm text-emerald-600 hover:underline">
            → חזרה ללוח הבקרה
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">חיבור חשבון WhatsApp</h1>
        </div>
        <p className="text-gray-500 mb-8 text-sm">חבר את המכשיר שלך כדי להתחיל לתזמן הודעות ופרסומים בקבוצות ללא מאמץ טכני.</p>

        {status === 'disconnected' && (
          <div className="py-6">
            <div className="bg-amber-50 text-amber-800 p-4 rounded-lg mb-6 text-sm inline-block">
              ⚠️ המכשיר אינו מחובר למערכת
            </div>
            <button 
              onClick={() => setStatus('creating')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition"
            >
              התחל חיבור חדש (יצירת קוד QR)
            </button>
          </div>
        )}

        {status === 'creating' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600 font-medium">מכין את סביבת החיבור המאובטחת שלך...</p>
            <button onClick={() => setStatus('waiting_for_qr')} className="mt-4 text-xs text-gray-400 underline">
              (הדמיית הצגת QR קוד)
            </button>
          </div>
        )}

        {status === 'waiting_for_qr' && (
          <div className="py-4 flex flex-col items-center">
            <p className="text-emerald-700 font-medium mb-4">הסביבה מוכנה! סרוק את קוד ה-QR מאפליקציית ה-WhatsApp בטלפון:</p>
            <div className="bg-gray-100 p-8 rounded-lg border border-gray-200 mb-4 w-64 h-64 flex items-center justify-center font-bold text-gray-400">
              [כאן יופיע ה-QR הדינמי]
            </div>
            <p className="text-xs text-gray-400 animate-pulse mb-4">ממתין לסריקת המכשיר מהנייד...</p>
            <button 
              onClick={() => setStatus('connected')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs"
            >
              הדמה סריקה מוצלחת ✅
            </button>
          </div>
        )}

        {status === 'connected' && (
          <div className="py-6">
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg mb-6 text-sm inline-block font-medium">
              ✅ הוואטסאפ שלך מחובר בהצלחה למערכת!
            </div>
            <p className="text-gray-700 mb-6">מספר מחובר סימולטיבי: <span className="font-bold">050-1234567</span></p>
            <button 
              onClick={() => setStatus('disconnected')}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-lg transition text-sm"
            >
              נתק מכשיר
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
