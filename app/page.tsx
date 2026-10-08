import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-right p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">WhatsApp SaaS</h1>
        <p className="text-gray-500 mb-8 text-sm">מערכת פשוטה ונקייה לעסקים קטנים לניהול ותזמון אוטומציות WhatsApp</p>
        
        <div className="space-y-4">
          <Link href="/login" className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition shadow-md">
            התחברות למערכת
          </Link>
          <div className="text-xs text-gray-400">
            * ה-MVP כולל את שני המוצרים: Scheduler ו-Group Publisher
          </div>
        </div>
      </div>
    </div>
  );
}
