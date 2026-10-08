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


## Supabase Auth setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. In Supabase Auth URL Configuration, add your local and Vercel URLs as allowed redirect URLs, including:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN/auth/callback`
5. Add the same environment variables in Vercel and redeploy.

Protected pages now require a real authenticated Supabase session. The app uses Next.js 16 `proxy.ts` for session refresh and route protection.


## Holiday Guard

Holiday Guard stores Israel Yom Tov dates in Supabase and refreshes them from the Hebcal Jewish Calendar REST API when future coverage runs low. Hebcal calendar data is used under the Creative Commons Attribution 4.0 license. The publisher checks this table before creating group dispatches for campaigns with `skip_holidays=true`.
