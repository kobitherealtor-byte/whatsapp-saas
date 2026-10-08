import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAutomationSecret } from '@/lib/automation-auth';

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);

    const body = (await request.json()) as {
      id?: string;
      claimToken?: string;
      success?: boolean;
      externalMessageId?: string | null;
      error?: string | null;
    };

    if (!body.id || !body.claimToken || typeof body.success !== 'boolean') {
      return NextResponse.json(
        { error: 'invalid_payload' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin.rpc('finalize_campaign_dispatch', {
      p_id: body.id,
      p_claim_token: body.claimToken,
      p_success: body.success,
      p_external_message_id: body.externalMessageId ?? null,
      p_error_text: body.error ?? null,
    });

    if (error) throw error;

    return NextResponse.json({ result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
