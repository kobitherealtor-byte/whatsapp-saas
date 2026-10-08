'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SchedulerList() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  // נתוני דוגמה להצגה ב-MVP
  const messages = [
    { id: '1', name: 'יוסי כהן', phone: '0501234567', body: 'תזכורת: הפגישה שלנו מחר', time: '12/10/2026 10:00', status: 'pending' },
    { id: '2', name: 'מיכל לוי', phone: '0529876543', body: 'חג שמח מיכל! מצורף הקופון שלך', time: '05/10/2026 16:00', status: 'sent' },
    { id: '3', name: 'אבי ארז', phone: '0541112223', body: 'החשבונית החודשית מוכנה', time: '01/10/2026 09:00', status: 'failed' },
  ];

  const filteredMessages = messages.filter(msg => filter === 'all' || msg.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-right" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Scheduler</h1>
            <p className="text-gray-500 text-sm">ניהול ותזמון הודעות אישיות ישירות ללקוחות שלך</p>
          </div>
          <Link href="/scheduler/new" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm">
            + תזמן הודעה חדשה
          </Link>
        </div>

        {/* פילטרים מהירים */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}>הכל</button>
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'pending' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>בתור לשליחה</button>
          <button onClick={() => setFilter('sent')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}>נשלחו בהצלחה</button>
          <button onClick={() => setFilter('failed')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'failed' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}>נכשלו</button>
        </div>

        {/* טבלת הודעות */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="p-4 font-medium">איש קשר / מספר</th>
                <th className="p-4 font-medium">תוכן ההודעה</th>
                <th className="p-4 font-medium">זמן מתוזמן</th>
                <th className="p-4 font-medium">סטטוס</th>
                <th className="p-4 font-medium text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700 text-sm">
              {filteredMessages.map(msg => (
                <tr key={msg.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{msg.name || 'ללא שם'}</div>
                    <div className="text-gray-400 text-xs">{msg.phone}</div>
                  </td>
                  <td className="p-4 max-w-md truncate">{msg.body}</td>
                  <td className="p-4 text-gray-600">{msg.time}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${msg.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : msg.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {msg.status === 'sent' ? 'נשלח' : msg.status === 'pending' ? 'ממתין' : 'נכשל'}
                    </span>
                  </td>
                  <td className="p-4 text-left space-x-2 space-x-reverse">
                    <button className="text-gray-500 hover:text-gray-900 ml-3">שכפול</button>
                    <button className="text-red-600 hover:text-red-800">ביטול</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}