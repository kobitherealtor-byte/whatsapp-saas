'use client';

import { useEffect, useMemo, useState } from 'react';
import MediaUpload from '@/components/MediaUpload';

type Chat = {
  id: string;
  name: string;
  archive: boolean;
  type: string;
  unreadCount: number;
};

type Message = {
  id: string;
  timestamp: number;
  type: string;
  senderId: string | null;
  senderName: string | null;
  text: string;
  downloadUrl: string | null;
  status: string | null;
};

function formatTime(timestamp: number) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(timestamp * 1000));
}

export default function InboxClient({
  embeddedUrl,
  embeddedAllowed = true,
}: {
  embeddedUrl: string | null;
  embeddedAllowed?: boolean;
}) {
  const [mode, setMode] = useState<'native' | 'embedded'>('native');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(q) ||
        chat.id.toLowerCase().includes(q),
    );
  }, [chats, query]);

  const loadChats = async () => {
    setLoadingChats(true);
    setError('');
    try {
      const response = await fetch('/api/inbox/chats', { cache: 'no-store' });
      const data = (await response.json()) as {
        chats?: Chat[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error || 'טעינת השיחות נכשלה.');

      const nextChats = data.chats ?? [];
      setChats(nextChats);
      setSelectedChat((current) => current ?? nextChats[0] ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'טעינת השיחות נכשלה.',
      );
    } finally {
      setLoadingChats(false);
    }
  };

  const loadHistory = async (chat: Chat) => {
    setLoadingHistory(true);
    setError('');
    try {
      const response = await fetch('/api/inbox/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, count: 70 }),
      });

      const data = (await response.json()) as {
        messages?: Message[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'טעינת היסטוריית השיחה נכשלה.');
      }

      setMessages(data.messages ?? []);
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : 'טעינת היסטוריית השיחה נכשלה.',
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat && mode === 'native') {
      void loadHistory(selectedChat);
    }
  }, [selectedChat?.id, mode]);

  const send = async () => {
    if (!selectedChat || (!message.trim() && !mediaUrl)) return;

    setSending(true);
    setError('');

    try {
      const optimistic: Message = {
        id: `local-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'outgoing',
        senderId: null,
        senderName: null,
        text: message.trim(),
        downloadUrl: mediaUrl || null,
        status: 'sending',
      };

      setMessages((current) => [...current, optimistic]);

      const response = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.id,
          message: message.trim(),
          mediaUrl: mediaUrl || null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'שליחת ההודעה נכשלה.');
      }

      setMessage('');
      setMediaUrl('');
      window.setTimeout(() => void loadHistory(selectedChat), 900);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : 'שליחת ההודעה נכשלה.',
      );
      if (selectedChat) {
        window.setTimeout(() => void loadHistory(selectedChat), 500);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-700">WhatsApp Inbox</p>
          <h1 className="mt-1 text-3xl font-black">כל השיחות במקום אחד</h1>
          <p className="mt-2 text-slate-500">
            צפייה בצ׳אטים, היסטוריה ושליחת הודעות מתוך המערכת.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode('native')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              mode === 'native'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Inbox מובנה
          </button>
          {embeddedAllowed && <button
            type="button"
            onClick={() => setMode('embedded')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              mode === 'embedded'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            WhatsApp Embedded
          </button>}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {mode === 'embedded' ? (
        embeddedUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <iframe
              src={embeddedUrl}
              title="WhatsApp Embedded"
              className="h-[76vh] w-full bg-white"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-lg font-black text-amber-950">
              מצב Embedded מוכן, אבל לא מופעל עדיין
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
              GREEN API מתעדים אפשרות להציג את ממשק Chats בתוך iframe, אבל
              הקישור הרגיל כולל את apiTokenInstance. לכן לא נחשוף אותו בדפדפן.
              ברגע שנקבל מהם כתובת Partner/White-label מאובטחת ללא token גלוי,
              נוכל להפעיל כאן את הממשק המוטמע בלי לשנות את מבנה המוצר.
            </p>
          </div>
        )
      ) : (
        <div className="grid min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-l">
            <div className="border-b border-slate-100 p-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש שיחה..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-[66vh] overflow-y-auto">
              {loadingChats ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  טוען שיחות...
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChat(chat)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right hover:bg-slate-50 ${
                      selectedChat?.id === chat.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        {chat.name}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-400">
                        {chat.type === 'group' ? 'קבוצה' : chat.id}
                      </div>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-black text-white">
                        {chat.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}

              {!loadingChats && filteredChats.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  לא נמצאו שיחות.
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[60vh] flex-col">
            {selectedChat ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="font-black">{selectedChat.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {selectedChat.type === 'group'
                        ? 'קבוצת WhatsApp'
                        : selectedChat.id}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadHistory(selectedChat)}
                    disabled={loadingHistory}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingHistory ? 'מרענן...' : 'רענן'}
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(to_bottom,_#f8fafc,_#f0fdf4)] p-5">
                  {loadingHistory && messages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      טוען היסטוריה...
                    </div>
                  ) : (
                    messages.map((item) => {
                      const outgoing =
                        item.type.toLowerCase().includes('outgoing') ||
                        item.senderId === null;

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            outgoing ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
                              outgoing
                                ? 'bg-emerald-100 text-slate-900'
                                : 'bg-white text-slate-900'
                            }`}
                          >
                            {item.senderName && !outgoing && (
                              <div className="mb-1 text-[11px] font-bold text-emerald-700">
                                {item.senderName}
                              </div>
                            )}
                            {item.text && (
                              <div className="whitespace-pre-wrap text-sm leading-6">
                                {item.text}
                              </div>
                            )}
                            {item.downloadUrl && (
                              <a
                                href={item.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block text-xs font-bold text-emerald-700 underline"
                              >
                                פתח קובץ מצורף
                              </a>
                            )}
                            <div className="mt-1 text-left text-[10px] text-slate-400">
                              {formatTime(item.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {!loadingHistory && messages.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">
                      אין היסטוריה להצגה בשיחה הזאת.
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-white p-4">
                  <div className="mb-3">
                    <MediaUpload
                      value={mediaUrl}
                      onChange={setMediaUrl}
                      disabled={sending}
                    />
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={2}
                      placeholder="כתוב הודעה..."
                      className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={
                        sending || (!message.trim() && !mediaUrl)
                      }
                      className="rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {sending ? 'שולח...' : 'שלח'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-400">
                בחר שיחה כדי להתחיל.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
