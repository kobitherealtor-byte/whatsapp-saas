'use client';

import React from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const stats = {
    connectionStatus: 'מחובר',
    phoneNumber: '050-1234567',
    scheduledToday: 5,
    activeCampaigns: 2,
    failedMessages: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* כותרת עליונה */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
            <p className="text-gray-500 mt-1">ברוך הבא! הנה תמונת מצב של האוטומציות שלך להיום.</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/scheduler/new" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm">
              + תזמון הודעה אישית
            </Link>
            <Link href="/publisher/new" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm">
              + קמפיין קבוצות חדש
            </Link>
          </div>
        </header>

        {/* סטטוס חיבור וואטסאפ */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
            <p className="font-medium text-gray-700">
              סטטוס וואטסאפ: <span className="font-bold">{stats.connectionStatus}</span>
              <span className="text-gray-500 text-sm mr-2">({stats.phoneNumber})</span>
            </p>
          </div>
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900 underline">
            ניהול חיבור
          </Link>
        </div>

        {/* מדדים */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-400">הודעות מתוזמנות להיום</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.scheduledToday}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-400">קמפיינים פעילים בקבוצות</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.activeCampaigns}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-400">הודעות שנכשלו</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.failedMessages}</p>
          </div>
        </div>

        {/* משימות קרובות */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">הודעות מתוכננות לשעות הקרובות</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-sm">
                  <th className="pb-3 font-medium">יעד / קבוצה</th>
                  <th className="pb-3 font-medium">סוג מוצר</th>
                  <th className="pb-3 font-medium">תוכן ההודעה</th>
                  <th className="pb-3 font-medium">זמן שליחה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 text-sm">
                <tr>
                  <td className="py-3 font-medium">יוסי כהן</td>
                  <td className="py-3 text-emerald-600 font-medium">הודעה אישית</td>
                  <td className="py-3 max-w-xs truncate">תזכורת: הפגישה שלנו נקבעה למחר בשעה...</td>
                  <td className="py-3 text-left">היום, 15:30</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">קבוצת "לקוחות VIP"</td>
                  <td className="py-3 text-blue-600 font-medium">פרסום בקבוצות</td>
                  <td className="py-3 max-w-xs truncate">מבצעי סוף השבוע החלו! קבלו הצצה...</td>
                  <td className="py-3 text-left">היום, 17:00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
