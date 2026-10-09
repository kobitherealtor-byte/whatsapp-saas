import 'server-only';

export function safeUserApiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (message === 'rate_limited') {
    return { message: 'יותר מדי בקשות. נסה שוב בעוד כמה דקות.', status: 429 };
  }

  if (message === 'unauthorized') {
    return { message: 'צריך להתחבר מחדש למערכת.', status: 401 };
  }

  if (message === 'no_instance') {
    return { message: 'עדיין אין חיבור WhatsApp לחשבון.', status: 404 };
  }

  return { message: fallback, status: 500 };
}
