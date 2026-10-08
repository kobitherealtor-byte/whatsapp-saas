# WhatsApp Plus MVP

מערכת SaaS בעברית לניהול שני מוצרים ממוקדים:

1. **WhatsApp Scheduler** — תזמון הודעות אישיות.
2. **Group Publisher** — פרסום מתוזמן לקבוצות WhatsApp.

## Stack

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4
- **Auth / Data:** Supabase
- **Automation backend:** Make
- **WhatsApp transport:** GREEN API

## עקרונות ארכיטקטורה

ה-Frontend לא אמור לשלוח הודעות WhatsApp בעצמו ולא לשמור GREEN API tokens בדפדפן.

הזרימה המתוכננת:

```
Next.js UI
   ↓
Supabase / API layer
   ↓
Make
   ↓
GREEN API
   ↓
WhatsApp
```

Make אחראי לתזמון, שליחה, retries, Holiday Guard והתראות.  
GREEN API אחראי לחיבור WhatsApp ולשליחה בפועל.

## מסכים

- `/` — עמוד כניסה / מוצר
- `/login` — התחברות
- `/dashboard` — לוח בקרה
- `/scheduler` — הודעות מתוזמנות
- `/scheduler/new` — הודעה חדשה
- `/publisher` — קמפיינים לקבוצות
- `/publisher/new` — קמפיין חדש
- `/calendar` — יומן
- `/settings` — חיבור WhatsApp / QR

## הרצה מקומית

```bash
npm install
npm run dev
```

## לפני Production

- להשלים Supabase Auth אמיתי בכל המסכים.
- לוודא RLS מלא לכל טבלה לפי `user_id`.
- להעביר כל secret ו-GREEN API token לצד שרת בלבד.
- לחבר Make webhooks / API routes.
- ליצור GREEN API instance לכל לקוח דרך Partner API.
- לסנכרן קבוצות WhatsApp לחשבון המשתמש.
- להחליף נתוני mock בקריאות למסד הנתונים.
- להוסיף idempotency, audit logs, retries ו-rate limits.
