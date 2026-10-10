'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AdminCustomerRow } from '@/lib/admin';

function statusLabel(status: string) {
  if (status === 'connected') return 'מחובר';
  if (status === 'waiting_for_qr') return 'ממתין ל-QR';
  if (status === 'creating') return 'בהקמה';
  if (status === 'error') return 'דורש טיפול';
  return 'מנותק';
}

export default function AdminCustomersClient({
  customers,
}: {
  customers: AdminCustomerRow[];
}) {
  const [query, setQuery] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'high'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesQuery =
        !q ||
        customer.email.toLowerCase().includes(q) ||
        (customer.businessName ?? '').toLowerCase().includes(q) ||
        (customer.phoneNumber ?? '').toLowerCase().includes(q);

      const matchesConnection =
        connectionFilter === 'all' ||
        customer.whatsappStatus === connectionFilter;

      const matchesBilling =
        billingFilter === 'all' ||
        customer.billingStatus === billingFilter;

      const matchesPlan =
        planFilter === 'all' ||
        customer.planCode === planFilter;

      const usageRatio =
        customer.sentThisPeriod / Math.max(1, customer.monthlySendLimit);
      const matchesUsage =
        usageFilter === 'all' || usageRatio >= 0.8;

      return (
        matchesQuery &&
        matchesConnection &&
        matchesBilling &&
        matchesPlan &&
        matchesUsage
      );
    });
  }, [
    customers,
    query,
    connectionFilter,
    billingFilter,
    planFilter,
    usageFilter,
  ]);

  const planOptions = useMemo(
    () => [...new Set(customers.map((customer) => customer.planCode))].sort(),
    [customers],
  );

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי עסק, אימייל או מספר..."
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />

        <select
          value={connectionFilter}
          onChange={(event) => setConnectionFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="all">כל חיבורי WhatsApp</option>
          <option value="connected">מחובר</option>
          <option value="waiting_for_qr">ממתין ל-QR</option>
          <option value="creating">בהקמה</option>
          <option value="error">דורש טיפול</option>
          <option value="disconnected">מנותק</option>
        </select>

        <select
          value={planFilter}
          onChange={(event) => setPlanFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="all">כל החבילות</option>
          {planOptions.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>

        <select
          value={billingFilter}
          onChange={(event) => setBillingFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="all">כל סטטוסי החשבון</option>
          <option value="beta">Beta</option>
          <option value="trialing">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={usageFilter}
          onChange={(event) =>
            setUsageFilter(event.target.value as 'all' | 'high')
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <option value="all">כל רמות השימוש</option>
          <option value="high">80%+ מהמכסה</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">לקוח</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">תוכנית</th>
                <th className="px-4 py-3">שליחות בתקופה</th>
                <th className="px-4 py-3">ממתינות</th>
                <th className="px-4 py-3">קבוצות</th>
                <th className="px-4 py-3">תפוצה</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-4">
                    <div className="font-bold">{customer.businessName || 'ללא שם עסק'}</div>
                    <div className="mt-1 text-xs text-slate-400">{customer.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold">{statusLabel(customer.whatsappStatus)}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {customer.phoneNumber || customer.providerState || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold">{customer.planCode}</div>
                    <div className="text-xs text-slate-400">{customer.billingStatus}</div>
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {customer.sentThisPeriod} / {customer.monthlySendLimit}
                  </td>
                  <td className="px-4 py-4">{customer.pendingMessages}</td>
                  <td className="px-4 py-4">{customer.activeGroupCampaigns}</td>
                  <td className="px-4 py-4">{customer.activeBroadcasts}</td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/${customer.id}`}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      פרטי לקוח
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-400">
            לא נמצאו לקוחות מתאימים.
          </div>
        )}
      </section>
    </>
  );
}
