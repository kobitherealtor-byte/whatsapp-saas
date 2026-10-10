import { NextResponse } from 'next/server';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Credential = {
  user_id: string;
  id_instance: string;
  api_token_instance: string;
  api_url: string;
};

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);

    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = Math.max(1, Math.min(Number(body.limit ?? 10), 50));

    const admin = createAdminClient();
    await admin.rpc('recover_stale_broadcast_claims');

    const { data: claimed, error } = await admin.rpc(
      'claim_due_broadcast_recipients',
      { p_limit: limit },
    );

    if (error) throw error;

    const rows = claimed ?? [];
    const userIds = [...new Set(rows.map((row: { user_id: string }) => row.user_id))];

    const { data: credentials, error: credentialsError } = userIds.length
      ? await admin
          .from('green_api_credentials')
          .select('user_id, id_instance, api_token_instance, api_url')
          .in('user_id', userIds)
      : { data: [], error: null };

    if (credentialsError) throw credentialsError;

    const credentialMap = new Map(
      ((credentials ?? []) as Credential[]).map((credential) => [
        credential.user_id,
        credential,
      ]),
    );

    const jobs = rows.map((row: {
      id: string;
      campaign_id: string;
      user_id: string;
      recipient_name: string | null;
      recipient_number: string;
      message_body: string;
      media_url: string | null;
      send_interval_seconds: number;
      claim_token: string;
    }) => {
      const credential = credentialMap.get(row.user_id);
      return {
        id: row.id,
        campaignId: row.campaign_id,
        claimToken: row.claim_token,
        recipientName: row.recipient_name,
        recipientNumber: row.recipient_number,
        message: row.message_body,
        mediaUrl: row.media_url,
        delaySeconds: Number(row.send_interval_seconds ?? 3),
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
    return NextResponse.json(
      { error: message },
      { status: message === 'unauthorized' ? 401 : 500 },
    );
  }
}
