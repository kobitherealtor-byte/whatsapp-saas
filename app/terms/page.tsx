import LegalPage from '@/components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      title="תנאי שימוש"
      intro="התנאים האלה מסדירים את השימוש במערכת WhatsApp Plus בתקופת ה-Beta ובהמשך השירות המסחרי."
    >
      <section>
        <h2 className="font-black">השירות</h2>
        <p className="mt-2">
          המערכת מאפשרת תזמון ושליחה של הודעות WhatsApp, קמפייני תפוצה, פרסום לקבוצות,
          ניהול חיבורים ופיצ׳רים נוספים בהתאם לחבילה הפעילה בחשבון.
        </p>
      </section>
      <section>
        <h2 className="font-black">אחריות המשתמש</h2>
        <p className="mt-2">
          המשתמש אחראי לכך שיש לו הרשאה חוקית לפנות לנמענים, לתוכן שנשלח, לעמידה בדין,
          ולשמירה על כללי WhatsApp וספק החיבור. אין להשתמש בשירות לספאם, התחזות,
          הטרדה, הונאה או תוכן אסור.
        </p>
      </section>
      <section>
        <h2 className="font-black">זמינות ושינויים</h2>
        <p className="mt-2">
          השירות נשען גם על ספקים חיצוניים ולכן זמינות מלאה אינה מובטחת. בתקופת Beta
          ייתכנו שינויים בממשק, במגבלות ובפיצ׳רים לצורך שיפור המוצר.
        </p>
      </section>
      <section>
        <h2 className="font-black">חבילות ומגבלות</h2>
        <p className="mt-2">
          היקף השימוש נקבע לפי החבילה, תוספים שנרכשו והגדרות מנהל המערכת. חריגה ממגבלה,
          חוב או ביטול יכולים לעצור שליחות או פיצ׳רים מסוימים.
        </p>
      </section>
    </LegalPage>
  );
}
