import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAccountLimits, getAccountUsage } from '@/lib/account-limits';

type AlertInput = {
  key: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  href?: string | null;
};

export async function refreshAccountAlerts(userId: string) {
  const admin = createAdminClient();
  const [
    limits,
    usage,
    connectionResult,
    failedResult,
    pausedCampaignsResult,
    broadcastErrorsResult,
  ] = await Promise.all([
    getAccountLimits(userId),
    getAccountUsage(userId),
    admin
      .from('whatsapp_connections')
      .select('status, last_error')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('send_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from('group_campaigns')
      .select('id, name, last_error')
      .eq('user_id', userId)
      .eq('status', 'paused')
      .not('last_error', 'is', null)
      .limit(10),
    admin
      .from('broadcast_campaigns')
      .select('id, name, last_error')
      .eq('user_id', userId)
      .not('last_error', 'is', null)
      .in('status', ['active', 'paused'])
      .limit(10),
  ]);

  if (connectionResult.error) throw new Error(connectionResult.error.message);
  if (failedResult.error) throw new Error(failedResult.error.message);
  if (pausedCampaignsResult.error) throw new Error(pausedCampaignsResult.error.message);
  if (broadcastErrorsResult.error) throw new Error(broadcastErrorsResult.error.message);

  const alerts: AlertInput[] = [];

  if (connectionResult.data?.status !== 'connected') {
    alerts.push({
      key: 'whatsapp_disconnected',
      severity: 'critical',
      title: 'WhatsApp לא מחובר',
      message:
        connectionResult.data?.last_error ||
        'צריך לחבר מחדש את WhatsApp כדי שהשליחות יוכלו לצאת.',
      href: '/settings',
    });
  }

  if (limits.billingStatus === 'past_due') {
    alerts.push({
      key: 'billing_past_due',
      severity: 'critical',
      title: 'נדרש טיפול בתשלום',
      message: 'השליחות נעצרו עד להסדרת מצב החיוב.',
      href: '/billing',
    });
  } else if (limits.billingStatus === 'cancelled') {
    alerts.push({
      key: 'billing_cancelled',
      severity: 'critical',
      title: 'החשבון אינו פעיל',
      message: 'החבילה בוטלה והשליחות חסומות.',
      href: '/billing',
    });
  }

  const usageRatio =
    usage.sentThisPeriod / Math.max(1, limits.monthlySendLimit);

  if (usageRatio >= 1) {
    alerts.push({
      key: 'monthly_limit_reached',
      severity: 'critical',
      title: 'מגבלת השליחות נוצלה',
      message:
        'נשלחו ' +
        usage.sentThisPeriod +
        ' מתוך ' +
        limits.monthlySendLimit +
        ' שליחות בתקופה הנוכחית.',
      href: '/billing',
    });
  } else if (usageRatio >= 0.8) {
    alerts.push({
      key: 'monthly_limit_80',
      severity: 'warning',
      title: 'מתקרבים למגבלת השליחות',
      message:
        'נוצלו ' +
        Math.round(usageRatio * 100) +
        '% ממכסת השליחות החודשית.',
      href: '/billing',
    });
  }

  if ((failedResult.count ?? 0) > 0) {
    alerts.push({
      key: 'failed_sends_24h',
      severity: 'warning',
      title: 'יש שליחות שנכשלו',
      message:
        String(failedResult.count ?? 0) +
        ' שליחות נכשלו ב-24 השעות האחרונות.',
      href: '/history',
    });
  }

  if ((pausedCampaignsResult.data ?? []).length > 0) {
    alerts.push({
      key: 'paused_campaign_errors',
      severity: 'warning',
      title: 'קמפיין קבוצות הושהה אחרי תקלות',
      message:
        String(pausedCampaignsResult.data?.length ?? 0) +
        ' קמפיינים דורשים בדיקה לפני הפעלה מחדש.',
      href: '/publisher',
    });
  }

  if ((broadcastErrorsResult.data ?? []).length > 0) {
    alerts.push({
      key: 'broadcast_campaign_errors',
      severity: 'warning',
      title: 'קמפיין תפוצה דורש טיפול',
      message:
        String(broadcastErrorsResult.data?.length ?? 0) +
        ' קמפייני תפוצה כוללים שגיאה אחרונה.',
      href: '/broadcasts',
    });
  }

  const activeKeys = alerts.map((alert) => alert.key);
  const now = new Date().toISOString();

  const { data: existingAlerts, error: existingAlertsError } = await admin
    .from('account_alerts')
    .select('id, alert_key, title, message, is_read')
    .eq('user_id', userId);

  if (existingAlertsError) throw new Error(existingAlertsError.message);

  const existingByKey = new Map(
    (existingAlerts ?? []).map((row) => [row.alert_key, row]),
  );

  for (const alert of alerts) {
    const existing = existingByKey.get(alert.key);
    const shouldResetRead =
      !existing ||
      existing.title !== alert.title ||
      existing.message !== alert.message;

    if (existing) {
      const { error } = await admin
        .from('account_alerts')
        .update({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          href: alert.href ?? null,
          is_read: shouldResetRead ? false : existing.is_read,
          resolved_at: null,
          updated_at: now,
        })
        .eq('id', existing.id)
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from('account_alerts')
        .insert({
          user_id: userId,
          alert_key: alert.key,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          href: alert.href ?? null,
          is_read: false,
          resolved_at: null,
          updated_at: now,
        });

      if (error) throw new Error(error.message);
    }
  }

  const { data: unresolved, error: unresolvedError } = await admin
    .from('account_alerts')
    .select('id, alert_key')
    .eq('user_id', userId)
    .is('resolved_at', null);

  if (unresolvedError) throw new Error(unresolvedError.message);

  const staleIds = (unresolved ?? [])
    .filter((row) => !activeKeys.includes(row.alert_key))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error: resolveError } = await admin
      .from('account_alerts')
      .update({ resolved_at: now, updated_at: now })
      .in('id', staleIds)
      .eq('user_id', userId);

    if (resolveError) throw new Error(resolveError.message);
  }
}

export async function getAccountAlerts(userId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('account_alerts')
    .select('id, alert_key, severity, title, message, href, is_read, created_at, updated_at')
    .eq('user_id', userId)
    .is('resolved_at', null)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}
