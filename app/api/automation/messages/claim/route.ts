import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAutomationSecret } from '@/lib/automation-auth';

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);

    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = Math.max(1, Math.min(Number(body.limit) || 25, 100));

    const admin = createAdminClient();

    await admin.rpc('recover_stale_message_claims');

    const { data: claimed, error: claimError } = await admin.rpc(
      'claim_due_scheduled_messages',
      { p_limit: limit },
    );

    if (claimError) throw claimError;

    const rows = (claimed ?? []) as Array<{
      id: string;
      user_id: string;
      recipient_number: string;
      recipient_name: string | null;
      message_body: string;
      media_url: string | null;
      scheduled_time: string;
      timezone: string;
      recurrence: string;
      claim_token: string;
    }>;

    if (rows.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const userIds = [...new Set(rows.map((row) => row.user_id))];

    const { data: credentials, error: credentialError } = await admin
      .from('green_api_credentials')
      .select('user_id, id_instance, api_token_instance, api_url')
      .in('user_id', userIds);

    if (credentialError) throw credentialError;

    const credentialsByUser = new Map(
      (credentials ?? []).map((credential) => [credential.user_id, credential]),
    );

    const jobs = rows.map((row) => {
      const credential = credentialsByUser.get(row.user_id);

      return {
        id: row.id,
        claimToken: row.claim_token,
        recipientNumber: row.recipient_number,
        recipientName: row.recipient_name,
        message: row.message_body,
        mediaUrl: row.media_url,
        scheduledAt: row.scheduled_time,
        timezone: row.timezone,
        recurrence: row.recurrence,
        connection: credential
          ? {
              idInstance: credential.id_instance,
              apiTokenInstance: credential.api_token_instance,
              apiUrl: credential.api_url,
            }
          : null,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
