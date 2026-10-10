import 'server-only';

import { requireAdmin } from '@/lib/admin';

export type ReadinessCheck = {
  key: string;
  label: string;
  status: 'ready' | 'pending' | 'warning';
  detail: string;
};

export async function getLaunchReadiness() {
  const { admin } = await requireAdmin();

  const [
    plansResult,
    adminUsersResult,
    maintenanceResult,
    alertResult,
  ] = await Promise.all([
    admin.from('plan_catalog').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('admin_users').select('*', { count: 'exact', head: true }),
    admin
      .from('system_maintenance_runs')
      .select('task_key, last_completed_at, last_status')
      .eq('task_key', 'message-media-cleanup')
      .maybeSingle(),
    admin.from('account_alerts').select('*', { count: 'exact', head: true }),
  ]);

  const checks: ReadinessCheck[] = [
    {
      key: 'supabase',
      label: 'Supabase',
      status:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
          ? 'ready'
          : 'pending',
      detail: 'Database, Auth ו-Storage מוגדרים בצד השרת.',
    },
    {
      key: 'automation-secret',
      label: 'Automation secret',
      status: process.env.AUTOMATION_SHARED_SECRET ? 'ready' : 'pending',
      detail: 'מגן על מסלולי Worker ותחזוקה.',
    },
    {
      key: 'make-wake',
      label: 'Make Wake',
      status: process.env.MAKE_WAKE_WEBHOOK_URL ? 'ready' : 'pending',
      detail: 'מעיר את ה-Worker רק כשיש עבודה.',
    },
    {
      key: 'plans',
      label: 'Plan catalog',
      status: (plansResult.count ?? 0) > 0 ? 'ready' : 'pending',
      detail: String(plansResult.count ?? 0) + ' חבילות פעילות מוגדרות.',
    },
    {
      key: 'admin',
      label: 'Admin access',
      status: (adminUsersResult.count ?? 0) > 0 ? 'ready' : 'pending',
      detail: String(adminUsersResult.count ?? 0) + ' משתמשי Admin מוגדרים.',
    },
    {
      key: 'alerts',
      label: 'Monitoring & alerts',
      status: alertResult.error ? 'warning' : 'ready',
      detail: 'התראות חיבור, שליחות, מכסה וחיוב זמינות.',
    },
    {
      key: 'media-cleanup',
      label: 'Media retention',
      status:
        maintenanceResult.data?.last_status === 'success'
          ? 'ready'
          : 'warning',
      detail: maintenanceResult.data?.last_completed_at
        ? 'ניקוי אחרון: ' + maintenanceResult.data.last_completed_at
        : 'המנגנון בנוי וירוץ עם ה-Worker הראשון.',
    },
    {
      key: 'green-webhooks',
      label: 'GREEN realtime fallback',
      status:
        process.env.GREEN_API_WEBHOOK_URL &&
        process.env.GREEN_API_WEBHOOK_TOKEN
          ? 'ready'
          : 'pending',
      detail:
        'Webhook מאובטח מוכן ל-Native Inbox ולסטטוס חיבור אם Embedded לא יהיה זמין.',
    },
    {
      key: 'green-partner',
      label: 'GREEN API Partner',
      status:
        process.env.GREEN_API_PARTNER_TOKEN &&
        process.env.GREEN_API_PARTNER_API_URL
          ? 'ready'
          : 'pending',
      detail: 'זה החיבור החסר ליצירת Instance אוטומטי לכל לקוח.',
    },
    {
      key: 'embedded',
      label: 'WhatsApp Embedded',
      status: process.env.GREEN_API_EMBEDDED_CHATS_URL ? 'ready' : 'warning',
      detail:
        'אופציונלי: Native Inbox כבר קיים. Embedded יופעל רק אם GREEN יספק דרך מאובטחת.',
    },
    {
      key: 'auth-passwords',
      label: 'Auth hardening',
      status: 'warning',
      detail:
        'ה-UI דורש סיסמה של 8+ תווים. Leaked Password Protection ב-Supabase דורש הפעלה ידנית ב-Auth settings.',
    },
  ];

  return {
    checks,
    blockers: checks.filter((check) => check.status === 'pending'),
    readyCount: checks.filter((check) => check.status === 'ready').length,
    total: checks.length,
  };
}
