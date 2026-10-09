'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setWhatsAppGroupEnabled } from '@/app/actions/groups';

type Group = {
  id: string;
  chat_id: string;
  name: string;
  participant_count: number | null;
  is_active: boolean;
  user_enabled: boolean;
  synced_at: string | null;
};

export default function GroupsClient({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDisabled, setShowDisabled] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((group) => {
      if (!showDisabled && !group.user_enabled) return false;
      return !q || group.name.toLowerCase().includes(q) || group.chat_id.toLowerCase().includes(q);
    });
  }, [groups, query, showDisabled]);

  const toggle = async (group: Group) => {
    setBusyId(group.id);
    setError('');
    setNotice('');

    try {
      await setWhatsAppGroupEnabled(group.id, !group.user_enabled);
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'עדכון הקבוצה נכשל.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/whatsapp/groups/sync', { method: 'POST' });
      const data = (await response.json()) as { synced?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'סנכרון הקבוצות נכשל.');
      }

      setNotice(`סונכרנו ${data.synced ?? 0} קבוצות WhatsApp.`);
      router.refresh();
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'סנכרון הקבוצות נכשל.',
      );
    } finally {
      setSyncing(false);
    }
  };

  const enabledCount = groups.filter((group) => group.is_active && group.user_enabled).length;

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black">ניהול קבוצות</h1>
          <p className="mt-1 text-slate-500">בחר אילו קבוצות יהיו זמינות לקמפיינים שלך.</p>
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {syncing ? 'מסנכרן...' : 'סנכרן מ-WhatsApp'}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-black">{groups.length}</div>
          <div className="mt-1 text-sm text-slate-500">קבוצות שסונכרנו</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-black">{enabledCount}</div>
          <div className="mt-1 text-sm text-slate-500">זמינות לקמפיינים</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-black">{groups.filter((group) => !group.is_active).length}</div>
          <div className="mt-1 text-sm text-slate-500">לא זמינות ב-WhatsApp</div>
        </div>
      </section>

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חפש קבוצה..."
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(event) => setShowDisabled(event.target.checked)}
          />
          הצג גם קבוצות מושבתות
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[2fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 md:grid">
          <div>קבוצה</div><div>מצב WhatsApp</div><div>שימוש בקמפיינים</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((group) => (
            <div key={group.id} className="grid gap-3 p-5 md:grid-cols-[2fr_1fr_1fr] md:items-center">
              <div>
                <div className="font-bold">{group.name}</div>
                <div className="mt-1 text-xs text-slate-400">{group.chat_id}</div>
              </div>
              <div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${group.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {group.is_active ? 'זמינה' : 'לא זמינה'}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  disabled={busyId === group.id || !group.is_active}
                  onClick={() => void toggle(group)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40 ${group.user_enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                >
                  {group.user_enabled ? 'בשימוש' : 'מושבתת'}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">לא נמצאו קבוצות.</div>
          )}
        </div>
      </div>
    </div>
  );
}
