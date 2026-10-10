import LegalPage from '@/components/LegalPage';

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="מדיניות שימוש מקובל"
      intro="השירות מיועד לתקשורת עסקית לגיטימית ולא למשלוח הודעות בלתי רצויות."
    >
      <section>
        <h2 className="font-black">אסור</h2>
        <p className="mt-2">
          אין להשתמש במערכת לספאם, הטרדה, התחזות, הונאה, פישינג, תוכן בלתי חוקי,
          עקיפת מגבלות ספק, או פנייה לאנשים ללא בסיס חוקי מתאים.
        </p>
      </section>
      <section>
        <h2 className="font-black">ניהול קצב שליחה</h2>
        <p className="mt-2">
          המשתמש נדרש להשתמש בקצב סביר ובהתאם לסוג הקשר עם הנמענים. המערכת רשאית
          להשהות חשבון או פיצ׳ר כאשר מזוהה שימוש חריג או מסוכן.
        </p>
      </section>
      <section>
        <h2 className="font-black">אכיפה</h2>
        <p className="mt-2">
          הפרה של המדיניות יכולה להוביל לחסימת שליחות, השהיית חשבון או ביטול הגישה
          לפיצ׳רים מסוימים.
        </p>
      </section>
    </LegalPage>
  );
}
