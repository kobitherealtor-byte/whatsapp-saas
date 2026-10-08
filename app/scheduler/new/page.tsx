'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createScheduledMessage } from '@/app/actions/messages';

export default function NewScheduledMessage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    name: '',
    body: '',
    date: '',
    time: '',
    recurrence: 'none'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // הפעלת פונקציית השרת האמיתית
      await createScheduledMessage(formData);
      alert('ההודעה נשמרה ותוזמנה בבסיס הנתונים בהצלחה!');
      window.location.href = '/scheduler';
    } catch (err: any) {
      alert(`שגיאה בשמירה: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-right" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/scheduler" className="text-sm text-emerald-600 hover:underline">→ חזרה</Link>
          <h1 className="text-2xl font-bold text-gray-900">תזמון הודעה אישית חדשה</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר טלפון ליעד *</label>
            <input type="tel" placeholder="0501234567" required className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})} disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם איש קשר</label>
            <input type="text" placeholder="שם הלקוח" className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה *</label>
            <textarea rows={4} required placeholder="מה לכתוב?" className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} disabled={loading} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תאריך *</label>
              <input type="date" required className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none text-right" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שעה *</label>
              <input type="time" required className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none text-right" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} disabled={loading} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">חזרה</label>
            <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none" value={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.value})} disabled={loading}>
              <option value="none">ללא חזרה</option>
              <option value="daily">כל יום</option>
              <option value="weekly">כל שבוע</option>
            </select>
          </div>
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition" disabled={loading}>
              {loading ? 'שומר בבסיס הנתונים...' : 'שמור ותזמן הודעה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
