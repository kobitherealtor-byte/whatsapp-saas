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
