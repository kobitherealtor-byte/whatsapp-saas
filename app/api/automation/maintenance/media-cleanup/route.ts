import { NextResponse } from 'next/server';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const TASK_KEY = 'message-media-cleanup';
const RETENTION_DAYS = 30;
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);
    const admin = createAdminClient();

    const { data: state, error: stateError } = await admin
      .from('system_maintenance_runs')
      .select('last_started_at, last_completed_at, last_status')
      .eq('task_key', TASK_KEY)
      .maybeSingle();

    if (stateError) throw stateError;

    const lastRun = state?.last_started_at
      ? new Date(state.last_started_at).getTime()
      : 0;

    if (lastRun && Date.now() - lastRun < MIN_INTERVAL_MS) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'recent_run' });
    }

    const startedAt = new Date().toISOString();

    await admin
      .from('system_maintenance_runs')
      .upsert(
        {
          task_key: TASK_KEY,
          last_started_at: startedAt,
          last_status: 'running',
          last_error: null,
          updated_at: startedAt,
        },
        { onConflict: 'task_key' },
      );

    const cutoffMs =
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const bucket = admin.storage.from('message-media');
    const { data: rootEntries, error: rootError } = await bucket.list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (rootError) throw rootError;

    const names: string[] = [];

    for (const entry of rootEntries ?? []) {
      if (names.length >= 500) break;

      // Upload paths are always <user-id>/<uuid>.<extension>.
      const { data: folderEntries, error: folderError } = await bucket.list(
        entry.name,
        {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        },
      );

      if (folderError) throw folderError;

      for (const object of folderEntries ?? []) {
        if (names.length >= 500) break;
        const createdAt = object.created_at
          ? new Date(object.created_at).getTime()
          : Number.POSITIVE_INFINITY;

        if (createdAt < cutoffMs) {
          names.push(`${entry.name}/${object.name}`);
        }
      }
    }

    if (names.length > 0) {
      const { error: removeError } = await bucket.remove(names);
      if (removeError) throw removeError;
    }

    const completedAt = new Date().toISOString();

    await admin
      .from('system_maintenance_runs')
      .upsert(
        {
          task_key: TASK_KEY,
          last_started_at: startedAt,
          last_completed_at: completedAt,
          last_status: 'success',
          last_error: null,
          updated_at: completedAt,
        },
        { onConflict: 'task_key' },
      );

    return NextResponse.json({
      ok: true,
      skipped: false,
      deleted: names.length,
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'cleanup_failed';

    try {
      const admin = createAdminClient();
      await admin
        .from('system_maintenance_runs')
        .upsert(
          {
            task_key: TASK_KEY,
            last_status: 'failed',
            last_error: message,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'task_key' },
        );
    } catch {
      // Preserve original cleanup error.
    }

    return NextResponse.json(
      { ok: false, error: message },
      { status: message === 'unauthorized' ? 401 : 500 },
    );
  }
}
