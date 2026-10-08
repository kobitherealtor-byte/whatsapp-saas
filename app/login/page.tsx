'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegister) {
      // כאן תתבצע קריאה ל-Supabase Auth להרשמה: supabase.auth.signUp()
      console.log('מבצע הרשמה עבור:', email);
      alert('הרשמה סימולטיבית הצליחה! כעת תוכל להיכנס למערכת.');
      setIsRegister(false);
    } else {
      // כאן תתבצע קריאה ל-Supabase Auth להתחברות: supabase.auth.signInWithPassword()
      console.log('מבצע התחברות עבור:', email);
      // העברה אוטומטית לדשבורד לצורך ה-MVP החזותי
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-right p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        {/* לוגו / כותרת */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">WhatsApp SaaS</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {isRegister ? 'צור חשבון חדש והתחל לתזמן אוטומציות' : 'התחבר לחשבון שלך כדי לנהל את ההפצות'}
          </p>
        </div>

        {/* טופס */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כתובת אימייל *</label>
            <input 
              type="email" 
              placeholder="name@company.com"
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
            <input 
              type="password" 
              placeholder="••••••••"
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-left placeholder-right"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition shadow-md"
          >
            {isRegister ? 'הרשמה למערכת' : 'התחברות'}
          </button>
        </form>

        {/* מעבר בין הרשמה להתחברות */}
        <div className="mt-6 text-center border-t border-gray-100 pt-4 text-sm">
          {isRegister ? (
            <p className="text-gray-600">
              כבר יש לך חשבון?{' '}
              <button onClick={() => setIsRegister(false)} className="text-emerald-600 font-bold hover:underline">
                התחבר כאן
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              עסק חדש?{' '}
              <button onClick={() => setIsRegister(true)} className="text-emerald-600 font-bold hover:underline">
                פתח חשבון בחינם
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
