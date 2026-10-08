import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type HebcalItem = {
  title?: string;
  date?: string;
};

type HebcalResponse = {
  items?: HebcalItem[];
};

function oneYearFromNowIsoDate() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export async function ensureHolidayGuardCalendar() {
  const admin = createAdminClient();

  const { data: latest, error: latestError } = await admin
    .from('holiday_dates')
    .select('holiday_date')
    .eq('country_code', 'IL')
    .order('holiday_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);

  if (
    latest?.holiday_date &&
    latest.holiday_date >= oneYearFromNowIsoDate()
  ) {
    return;
  }

  const currentYear = new Date().getUTCFullYear();
  const rows = new Map<string, string>();

  for (const year of [currentYear, currentYear + 1, currentYear + 2]) {
    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      yto: 'on',
      i: 'on',
      year: String(year),
      yt: 'G',
      lg: 'he-x-NoNikud',
    });

    const response = await fetch(
      `https://www.hebcal.com/hebcal?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'WhatsApp-Plus-Holiday-Guard/1.0',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(
        `Holiday Guard calendar sync failed with HTTP ${response.status}`,
      );
    }

    const calendar = (await response.json()) as HebcalResponse;

    for (const item of calendar.items ?? []) {
      if (!item.date || !item.title) continue;
      rows.set(item.date.slice(0, 10), item.title);
    }
  }

  if (rows.size === 0) {
    throw new Error('Holiday Guard calendar returned no Yom Tov dates.');
  }

  const { error: upsertError } = await admin
    .from('holiday_dates')
    .upsert(
      [...rows.entries()].map(([holidayDate, name]) => ({
        holiday_date: holidayDate,
        name,
        country_code: 'IL',
      })),
      { onConflict: 'holiday_date' },
    );

  if (upsertError) throw new Error(upsertError.message);
}
