import LegalPage from '@/components/LegalPage';

export default function CancellationPage() {
  return (
    <LegalPage
      title="ביטול והחזרים"
      intro="מדיניות החיוב הסופית תוצג לפני פתיחת השירות המסחרי וקבלת תשלום אמיתי."
    >
      <section>
        <h2 className="font-black">תקופת Beta</h2>
        <p className="mt-2">
          כל עוד לא הופעל ספק סליקה מסחרי, אין חיוב אוטומטי דרך המערכת.
        </p>
      </section>
      <section>
        <h2 className="font-black">לאחר פתיחה מסחרית</h2>
        <p className="mt-2">
          תנאי הביטול, מועד הפסקת השירות וזכאות להחזר יוצגו בעמוד התמחור ובמסך
          הרכישה לפני ביצוע העסקה, בהתאם לחבילה ולדין החל.
        </p>
      </section>
    </LegalPage>
  );
}
