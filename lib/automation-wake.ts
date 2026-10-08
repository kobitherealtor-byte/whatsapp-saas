import 'server-only';

export async function wakeAutomationWorker() {
  const url = process.env.MAKE_WAKE_WEBHOOK_URL;
  if (!url) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ source: 'whatsapp-plus' }),
      signal: controller.signal,
    });
  } catch {
    // Saving user data must never fail only because the wake webhook is unavailable.
  } finally {
    clearTimeout(timeout);
  }
}
