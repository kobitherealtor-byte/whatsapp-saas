'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';

type ConnectionStatus =
  | 'disconnected'
  | 'creating'
  | 'waiting_for_qr'
  | 'connected'
  | 'error';

type StatusPayload = {
  status?: ConnectionStatus;
  providerState?: string | null;
  phoneNumber?: string | null;
  error?: string;
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const autoConnectStarted = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>('creating');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [providerState, setProviderState] = useState<string | null>(null);
  const [rebooting, setRebooting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncingGroups, setSyncingGroups] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/status', {
        cache: 'no-store',
      });
      const data = (await response.json()) as StatusPayload;

      if (!response.ok) {
        throw new Error(data.error || 'לא ניתן לבדוק את מצב החיבור.');
      }

      const nextStatus = data.status ?? 'disconnected';
      setStatus(nextStatus);
      setPhoneNumber(data.phoneNumber ?? null);
      setProviderState(data.providerState ?? null);
      setError('');

      if (nextStatus !== 'waiting_for_qr') {
        setQrDataUrl(null);
      }
    } catch (statusError) {
      setStatus('error');
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'לא ניתן לבדוק את מצב החיבור.',
      );
    }
  }, []);

  const loadQr = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/qr', {
        cache: 'no-store',
      });
      const data = (await response.json()) as {
        type?: string;
        dataUrl?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'לא ניתן לקבל QR כרגע.');
      }

      if (data.type === 'qrCode' && data.dataUrl) {
        setQrDataUrl(data.dataUrl);
        setError('');
      } else if (data.type === 'alreadyLogged') {
        await loadStatus();
      }
    } catch (qrError) {
      setError(
        qrError instanceof Error ? qrError.message : 'לא ניתן לקבל QR כרגע.',
      );
    }
  }, [loadStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status !== 'creating' && status !== 'waiting_for_qr') return;

    const statusTimer = window.setInterval(() => {
      void loadStatus();
    }, 5000);

    return () => window.clearInterval(statusTimer);
  }, [loadStatus, status]);

  useEffect(() => {
    if (status !== 'waiting_for_qr') return;

    void loadQr();

    const qrTimer = window.setInterval(() => {
      void loadQr();
    }, 10000);

    return () => window.clearInterval(qrTimer);
  }, [loadQr, status]);

  const syncGroups = async () => {
    setSyncingGroups(true);
    setSyncMessage('');
    setError('');

    try {
      const response = await fetch('/api/whatsapp/groups/sync', {
        method: 'POST',
      });
      const data = (await response.json()) as {
        synced?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'סנכרון הקבוצות נכשל.');
      }

      setSyncMessage(`סונכרנו ${data.synced ?? 0} קבוצות WhatsApp.`);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'סנכרון הקבוצות נכשל.',
      );
    } finally {
      setSyncingGroups(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('לנתק את חשבון ה-WhatsApp מהמופע?')) return;

    setDisconnecting(true);
    setError('');
    setSyncMessage('');

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
      });
      const data = (await response.json()) as StatusPayload & {
        ok?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || 'ניתוק WhatsApp נכשל.');
      }

      setStatus(data.status ?? 'waiting_for_qr');
      setPhoneNumber(null);
      setQrDataUrl(null);
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : 'ניתוק WhatsApp נכשל.',
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const reboot = async () => {
    setRebooting(true);
    setError('');
    try {
      const response = await fetch('/api/whatsapp/reboot', { method: 'POST' });
      const data = (await response.json()) as StatusPayload;

      if (!response.ok) {
        throw new Error(data.error || 'אתחול החיבור נכשל.');
      }

      setStatus('creating');
      setProviderState('starting');
      window.setTimeout(() => void loadStatus(), 5000);
    } catch (rebootError) {
      setError(
        rebootError instanceof Error
          ? rebootError.message
          : 'אתחול החיבור נכשל.',
      );
    } finally {
      setRebooting(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      const data = (await response.json()) as StatusPayload & {
        created?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || 'יצירת החיבור נכשלה.');
      }

      setStatus(data.status ?? 'creating');
      await loadStatus();
    } catch (connectError) {
      setStatus('error');
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'יצירת החיבור נכשלה.',
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('connect') !== '1' || autoConnectStarted.current) return;
    if (status !== 'disconnected') return;

    autoConnectStarted.current = true;
    void connect();
  }, [searchParams, status]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">חיבור WhatsApp</h1>
            <p className="mt-1 text-slate-500">
              חיבור פשוט דרך QR — בלי מפתחות, טוקנים או מסכים טכניים.
            </p>
          </div>
          <a href="/account" className="text-sm font-bold text-emerald-700 hover:underline">החשבון שלי</a>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {status === 'disconnected' && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                ◌
              </div>
              <h2 className="text-xl font-extrabold">
                WhatsApp עדיין לא מחובר
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                לחץ על הכפתור. המערכת תיצור עבורך GREEN API Instance ייעודי
                ותציג QR לסריקה. אם הגעת לכאן מתוך שליחה או Inbox, החיבור מתחיל אוטומטית.
              </p>
              <button
                onClick={connect}
                disabled={busy}
                className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
              >
                {busy ? 'מכין חיבור...' : 'חבר WhatsApp'}
              </button>
            </div>
          )}

          {status === 'creating' && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
              <h2 className="font-extrabold">
                {providerState === 'sleepMode'
                  ? 'WhatsApp במצב שינה'
                  : providerState === 'starting'
                    ? 'החיבור בתהליך הפעלה'
                    : 'מכין חיבור מאובטח...'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {providerState === 'sleepMode'
                  ? 'הטלפון המחובר כנראה לא היה זמין. המערכת תבדוק שוב אוטומטית.'
                  : providerState === 'starting'
                    ? 'המערכת ממתינה לסיום ההפעלה. בדרך כלל זה מסתיים בתוך כמה דקות.'
                    : 'החיבור מוקם והסטטוס מתעדכן אוטומטית.'}
              </p>
              {(providerState === 'starting' || providerState === 'sleepMode') && (
                <button
                  type="button"
                  onClick={() => void reboot()}
                  disabled={rebooting}
                  className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  {rebooting ? 'מאתחל...' : 'אתחל חיבור'}
                </button>
              )}
            </div>
          )}

          {status === 'waiting_for_qr' && (
            <div className="text-center">
              <h2 className="text-xl font-extrabold">סרוק את הקוד מהטלפון</h2>
              <p className="mt-2 text-sm text-slate-500">
                WhatsApp → מכשירים מקושרים → קישור מכשיר
              </p>

              <div className="mx-auto my-6 flex aspect-square w-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="WhatsApp QR"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-sm font-bold text-slate-400">
                    טוען QR...
                  </div>
                )}
              </div>

              <div className="text-xs font-semibold text-amber-700">
                ממתין לסריקה... הקוד מתרענן אוטומטית
              </div>

              <button
                type="button"
                onClick={() => void loadQr()}
                className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50"
              >
                רענן QR
              </button>
            </div>
          )}

          {status === 'connected' && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-extrabold text-emerald-900">
                WhatsApp מחובר
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                החיבור פעיל ומוכן לשימוש.
              </p>

              <div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-right text-sm text-emerald-900">
                <div className="font-bold">הכל מוכן</div>
                <div className="mt-1 text-emerald-700">
                  {phoneNumber
                    ? `מספר מחובר: ${phoneNumber}`
                    : 'אפשר לתזמן הודעות ולהפעיל קמפיינים לקבוצות.'}
                </div>
              </div>

              <button
                type="button"
                onClick={syncGroups}
                disabled={syncingGroups}
                className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
              >
                {syncingGroups ? 'מסנכרן קבוצות...' : 'סנכרן קבוצות WhatsApp'}
              </button>

              {syncMessage && (
                <div className="mt-3 text-sm font-semibold text-emerald-700">
                  {syncMessage}
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={disconnecting}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {disconnecting ? 'מנתק...' : 'נתק WhatsApp'}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                !
              </div>
              <h2 className="text-xl font-extrabold">החיבור דורש טיפול</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {providerState === 'blocked'
                  ? 'חשבון WhatsApp נחסם. השליחות נעצרו עד להסדרת החסימה.'
                  : providerState === 'suspended' || providerState === 'yellowCard'
                    ? 'יש כרגע הגבלות זמניות על החשבון. השליחות נעצרו כדי לא לצבור כשלונות.'
                    : 'החיבור דורש בדיקה לפני שנמשיך לשלוח.'}
              </p>
              <button
                onClick={() => void loadStatus()}
                className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50"
              >
                בדוק שוב
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
