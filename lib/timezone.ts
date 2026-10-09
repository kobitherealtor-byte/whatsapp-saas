export const APP_TIMEZONE = 'Asia/Jerusalem';

export function formatInIsrael(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(date);
}

export function getIsraelDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return asUtc - date.getTime();
}

export function israelLocalDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(localAsUtc);

  for (let i = 0; i < 2; i += 1) {
    const offset = getTimeZoneOffsetMs(candidate, APP_TIMEZONE);
    candidate = new Date(localAsUtc - offset);
  }

  return candidate;
}

export function nextCampaignRun(
  daysOfWeek: number[],
  sendTime: string,
  now = new Date(),
  startDate?: string | null,
  endDate?: string | null,
) {
  const [hourText, minuteText] = sendTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('שעת הפרסום אינה תקינה.');
  }

  const current = getIsraelDateParts(now);
  const startFloor = startDate ? new Date(`${startDate}T00:00:00Z`) : null;
  const endCeiling = endDate ? new Date(`${endDate}T23:59:59Z`) : null;

  for (let offsetDays = 0; offsetDays < 370; offsetDays += 1) {
    const calendarDate = new Date(
      Date.UTC(current.year, current.month - 1, current.day + offsetDays),
    );

    const year = calendarDate.getUTCFullYear();
    const month = calendarDate.getUTCMonth() + 1;
    const day = calendarDate.getUTCDate();
    const weekday = calendarDate.getUTCDay();

    if (startFloor && calendarDate.getTime() < startFloor.getTime()) continue;
    if (endCeiling && calendarDate.getTime() > endCeiling.getTime()) {
      return null;
    }
    if (!daysOfWeek.includes(weekday)) continue;

    const candidate = israelLocalDateTimeToUtc(
      year,
      month,
      day,
      hour,
      minute,
    );

    if (candidate.getTime() > now.getTime()) {
      return candidate.toISOString();
    }
  }

  return null;
}


export function dateKeyInTimeZone(
  value: string | Date,
  timeZone = APP_TIMEZONE,
) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}


export function parseIsraelLocalDateTimeInput(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('תאריך או שעה אינם תקינים.');
    }
    return date;
  }

  const [, year, month, day, hour, minute] = match;
  return israelLocalDateTimeToUtc(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
  );
}
