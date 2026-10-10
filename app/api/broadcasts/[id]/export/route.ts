import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get('status');

  const { data: campaign, error: campaignError } = await supabase
    .from('broadcast_campaigns')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (campaignError) throw campaignError;
  if (!campaign) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let query = supabase
    .from('broadcast_recipients')
    .select('recipient_name, recipient_number, normalized_number, status, retry_count, sent_at, error_text, updated_at')
    .eq('campaign_id', id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10000);

  if (
    requestedStatus &&
    ['pending', 'processing', 'sent', 'failed', 'skipped', 'cancelled'].includes(
      requestedStatus,
    )
  ) {
    query = query.eq('status', requestedStatus);
  }

  const { data: recipients, error } = await query;
  if (error) throw error;

  const headers = [
    'name',
    'phone',
    'normalized_phone',
    'status',
    'retry_count',
    'sent_at',
    'error',
    'updated_at',
  ];

  const lines = [
    headers.map(csvCell).join(','),
    ...(recipients ?? []).map((row) =>
      [
        row.recipient_name,
        row.recipient_number,
        row.normalized_number,
        row.status,
        row.retry_count,
        row.sent_at,
        row.error_text,
        row.updated_at,
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  const safeName = (campaign.name || 'broadcast')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .slice(0, 80);

  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + safeName + '.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
