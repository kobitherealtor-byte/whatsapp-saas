'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import LogoutButton from '@/components/LogoutButton';

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה' },
  { href: '/scheduler', label: 'הודעות', feature: 'scheduler' },
  { href: '/publisher', label: 'פרסום לקבוצות', feature: 'group_publisher' },
  { href: '/broadcasts', label: 'תפוצה', feature: 'broadcasts' },
  { href: '/inbox', label: 'Inbox', feature: 'inbox' },
  { href: '/calendar', label: 'יומן' },
  { href: '/history', label: 'היסטוריה' },
  { href: '/settings', label: 'הגדרות' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch('/api/me/features', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.features) setFeatures(data.features);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const visibleNavItems = navItems.filter(
    (item) => !item.feature || features === null || features[item.feature] !== false,
  );

  const mobilePrimaryOrder = ['/dashboard', '/scheduler', '/inbox', '/broadcasts'];
  const mobilePrimary = mobilePrimaryOrder
    .map((href) => visibleNavItems.find((item) => item.href === href))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 4);

  const mobileMoreItems = visibleNavItems.filter(
    (item) => !mobilePrimary.some((primary) => primary.href === item.href),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-sm">W</div>
            <div className="leading-tight">
              <div className="font-extrabold">WhatsApp Plus</div>
              <div className="text-xs text-slate-500">תזמון והפצה חכמה</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive(pathname, item.href)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/settings" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex">
              ניהול WhatsApp
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>

      {mobileMoreOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/25 lg:hidden" onClick={() => setMobileMoreOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 px-2 text-xs font-bold text-slate-400">עוד אפשרויות</div>
            <div className="grid grid-cols-2 gap-2">
              {mobileMoreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMoreOpen(false)}
                  className={`rounded-xl px-3 py-3 text-center text-sm font-bold ${
                    isActive(pathname, item.href)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white lg:hidden">
        <div className="grid grid-cols-5">
          {mobilePrimary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-3 text-center text-[11px] font-semibold ${
                isActive(pathname, item.href) ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMobileMoreOpen((open) => !open)}
            className={`px-2 py-3 text-center text-[11px] font-semibold ${
              mobileMoreOpen || mobileMoreItems.some((item) => isActive(pathname, item.href))
                ? 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            עוד
          </button>
        </div>
      </nav>
    </div>
  );
}
