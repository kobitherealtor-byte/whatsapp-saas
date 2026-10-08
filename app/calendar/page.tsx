'use client';

import React from 'react';
import Link from 'next/link';

export default function CalendarPage() {
  const events = [
    { id: '1', title: 'הודעה ליוסי כהן', day: 8, type: 'scheduler', time: '15:30' },
    { id: '2', title: 'קמפיין VIP לקבוצות', day: 8, type: 'publisher', time: '17:00' },
    { id: '3', title: 'הודעה למיכל לוי', day: 12, type: 'scheduler', time: '10:00' },
    { id: '4', title: 'פרסום קבוצת נטוורקינג', day: 15, type: 'publisher', time: '09:00' },
    { id: '5', title: 'ברכת שבת שלום לקבוצות', day: 23, type: 'publisher', time: '14:00' },
  ];

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const blanks = Array.from({ length: 4 }, (_, i) => i);
  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const handleEventClick = (title: string, time: string) => {
    alert(`עריכת אירוע: ${title}\nשעת שליחה: ${time}\n\nבגרסה המלאה כאן ייפתח חלון עריכה מהירה.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-right" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* כותרת עליונה */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:underline text-emerald-600">לוח בקרה</Link>
              <span>/</span>
              <span>יומן משימות</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">יומן הפצות מתוזמנות</h1>
            <p className="text-gray-500 text-sm">מבט על של כל ההודעות והקמפיינים המתוכננים לחודש זה</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <span className="text-lg font-bold text-gray-800 px-2">אוקטובר 2026</span>
          </div>
        </header>

        {/* מקרא */}
        <div className="flex gap-4 mb-4 text-xs font-medium text-gray-600 bg-white p-3 rounded-lg border border-gray-100 inline-flex">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
            <span>הודעה אישית (Scheduler)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 block"></span>
            <span>פרסום בקבוצות (Publisher)</span>
          </div>
        </div>

        {/* גריד היומן */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center font-bold text-gray-700 text-sm py-3">
            {daysOfWeek.map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-5 divide-x divide-y divide-reverse divide-gray-100 min-h-[600px] bg-gray-50/30">
            
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="bg-gray-50/50 p-2 border-b border-gray-100"></div>
            ))}

            {daysInMonth.map(day => {
              const dayEvents = events.filter(e => e.day === day);
              const isToday = day === 8;

              return (
                <div 
                  key={day} 
                  className={`p-2 bg-white transition flex flex-col justify-between border-b border-gray-100 min-h-[100px] ${isToday ? 'bg-emerald-50/30 ring-1 ring-emerald-500 ring-inset' : 'hover:bg-gray-50/50'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold p-1 rounded-md min-w-[24px] text-center ${isToday ? 'bg-emerald-600 text-white' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {isToday && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">היום</span>}
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event.title, event.time)}
                        className={`w-full text-right text-[11px] font-medium p-1 rounded border transition truncate block ${
                          event.type === 'scheduler' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-blue-50 text-blue-800 border-blue-100 hover:bg-blue-100'
                        }`}
                      >
                        <span className="font-bold ml-1">[{event.time}]</span>
                        {event.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
