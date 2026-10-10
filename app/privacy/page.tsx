import LegalPage from '@/components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="מדיניות פרטיות"
      intro="אנחנו שומרים רק את המידע שנדרש להפעלת החשבון, שליחת ההודעות, אבטחה, תמיכה וחיוב."
    >
      <section>
        <h2 className="font-black">מידע שנשמר</h2>
        <p className="mt-2">
          בין היתר: פרטי חשבון, פרטי עסק, הגדרות חבילה, סטטוס חיבור WhatsApp, תזמונים,
          נמענים, סטטוסי שליחה, לוגים ומדיה שהמשתמש מעלה לצורך שליחה.
        </p>
      </section>
      <section>
        <h2 className="font-black">פרטי גישה</h2>
        <p className="mt-2">
          מפתחות API ופרטי ספק נשמרים בצד השרת ואינם מיועדים להצגה למשתמשי קצה.
          המערכת משתמשת בבקרות הרשאה כדי להפריד בין חשבונות שונים.
        </p>
      </section>
      <section>
        <h2 className="font-black">שמירת מדיה</h2>
        <p className="mt-2">
          קבצי מדיה שמועלים למערכת מיועדים לשליחה ונמחקים במחזור תחזוקה לאחר תקופת
          שמירה מוגבלת. לוגים ומידע תפעולי יכולים להישמר זמן ארוך יותר לצורכי אבטחה,
          תפעול ותמיכה.
        </p>
      </section>
      <section>
        <h2 className="font-black">ספקים חיצוניים</h2>
        <p className="mt-2">
          לצורך הפעלת השירות נעשה שימוש בספקי תשתית, מסד נתונים, אוטומציה וחיבור
          WhatsApp. המידע מועבר אליהם רק ככל שנדרש להפעלת הפונקציה הרלוונטית.
        </p>
      </section>
    </LegalPage>
  );
}
