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

    const cutoff = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: objects, error: objectError } = await admin
      .schema('storage')
      .from('objects')
      .select('name, created_at')
      .eq('bucket_id', 'message-media')
      .lt('created_at', cutoff)
      .limit(500);

    if (objectError) throw objectError;

    const names = (objects ?? [])
      .map((object) => object.name as string)
      .filter(Boolean);

    if (names.length > 0) {
      const { error: removeError } = await admin.storage
        .from('message-media')
        .remove(names);

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
