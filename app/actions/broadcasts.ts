'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { wakeAutomationWorker } from '@/lib/automation-wake';
import { assertAccountOperational, getAccountLimits } from '@/lib/account-limits';
import { writeAuditEvent } from '@/lib/audit';

type RecipientInput = {
  name?: string;
  phone: string;
};

function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00972')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('צריך להתחבר למערכת.');
  return { supabase, user };
}

export async function createBroadcastCampaign(input: {
  name: string;
  message: string;
  mediaUrl?: string;
  scheduledAt: string;
  intervalSeconds: number;
  recipients: RecipientInput[];
}) {
  const { supabase, user } = await requireUser();
  await assertAccountOperational(user.id);
  const limits = await getAccountLimits(user.id);

  if (!input.name.trim()) throw new Error('שם הקמפיין חסר.');
  if (!input.message.trim()) throw new Error('תוכן ההודעה חסר.');

  const scheduledFor = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledFor.getTime())) throw new Error('תאריך או שעה אינם תקינים.');
  if (scheduledFor.getTime() <= Date.now()) throw new Error('זמן השליחה חייב להיות בעתיד.');

  const intervalSeconds = Math.max(1, Math.min(Math.round(input.intervalSeconds || 3), 3600));

  const normalized = new Map<string, RecipientInput>();
  for (const recipient of input.recipients) {
    const normalizedNumber = normalizePhone(recipient.phone);
    if (!normalizedNumber) continue;
    if (!normalized.has(normalizedNumber)) {
      normalized.set(normalizedNumber, {
        name: recipient.name?.trim() || '',
        phone: recipient.phone,
      });
    }
  }

  const recipients = [...normalized.entries()];
  if (recipients.length === 0) throw new Error('לא נמצאו מספרי טלפון תקינים.');
  if (recipients.length > limits.maxBroadcastRecipients) {
    throw new Error(`אפשר לשלוח עד ${limits.maxBroadcastRecipients} נמענים בקמפיין אחד.`);
  }

  const admin = createAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from('broadcast_campaigns')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      message_body: input.message.trim(),
      media_url: input.mediaUrl?.trim() || null,
      scheduled_for: scheduledFor.toISOString(),
      timezone: 'Asia/Jerusalem',
      status: 'active',
      send_interval_seconds: intervalSeconds,
      total_recipients: recipients.length,
    })
    .select('id')
    .single();

  if (campaignError) throw new Error(campaignError.message);

  const base = scheduledFor.getTime();
  const rows = recipients.map(([normalizedNumber, recipient], index) => ({
    campaign_id: campaign.id,
    user_id: user.id,
    recipient_name: recipient.name?.trim() || null,
    recipient_number: recipient.phone.trim(),
    normalized_number: normalizedNumber,
    status: 'pending',
    available_at: new Date(base + index * intervalSeconds * 1000).toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin
      .from('broadcast_recipients')
      .insert(rows.slice(i, i + 500));

    if (error) {
      await admin.from('broadcast_campaigns').delete().eq('id', campaign.id);
      throw new Error(error.message);
    }
  }

  await writeAuditEvent({
    userId: user.id,
    eventType: 'broadcast_campaign.created',
    entityType: 'broadcast_campaign',
    entityId: campaign.id,
    metadata: { recipients: recipients.length, intervalSeconds },
  });

  revalidatePath('/broadcasts');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  await wakeAutomationWorker();

  return { id: campaign.id, recipients: recipients.length };
}

export async function setBroadcastCampaignStatus(
  id: string,
  status: 'active' | 'paused' | 'cancelled',
) {
  const { user } = await requireUser();
  const admin = createAdminClient();

  if (status === 'active') await assertAccountOperational(user.id);

  const { data: campaign, error: campaignError } = await admin
    .from('broadcast_campaigns')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) throw new Error('הקמפיין לא נמצא.');
  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    throw new Error('אי אפשר לשנות קמפיין שהסתיים או בוטל.');
  }

  const { error } = await admin
    .from('broadcast_campaigns')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  if (status === 'cancelled') {
    await admin
      .from('broadcast_recipients')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('campaign_id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending');
  }

  await writeAuditEvent({
    userId: user.id,
    eventType: `broadcast_campaign.${status}`,
    entityType: 'broadcast_campaign',
    entityId: id,
  });

  revalidatePath('/broadcasts');
  revalidatePath(`/broadcasts/${id}`);
  await wakeAutomationWorker();
}

export async function retryBroadcastRecipient(id: string) {
  const { user } = await requireUser();
  await assertAccountOperational(user.id);
  const admin = createAdminClient();

  const { data: recipient, error: recipientError } = await admin
    .from('broadcast_recipients')
    .select('id, campaign_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (recipientError) throw new Error(recipientError.message);
  if (!recipient) throw new Error('הנמען לא נמצא.');
  if (recipient.status !== 'failed') throw new Error('אפשר לנסות שוב רק שליחה שנכשלה.');

  const { error } = await admin
    .from('broadcast_recipients')
    .update({
      status: 'pending',
      retry_count: 0,
      error_text: null,
      claim_token: null,
      claimed_at: null,
      available_at: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  const { data: campaignState } = await admin
    .from('broadcast_campaigns')
    .select('failed_count, status')
    .eq('id', recipient.campaign_id)
    .eq('user_id', user.id)
    .maybeSingle();

  await admin
    .from('broadcast_campaigns')
    .update({
      status: campaignState?.status === 'completed' ? 'active' : campaignState?.status,
      failed_count: Math.max(0, Number(campaignState?.failed_count ?? 0) - 1),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipient.campaign_id)
    .eq('user_id', user.id);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'broadcast_recipient.retry_requested',
    entityType: 'broadcast_recipient',
    entityId: id,
  });

  revalidatePath('/broadcasts');
  revalidatePath(`/broadcasts/${recipient.campaign_id}`);
  await wakeAutomationWorker();
}

export async function retryFailedBroadcastRecipients(campaignId: string) {
  const { user } = await requireUser();
  await assertAccountOperational(user.id);
  const admin = createAdminClient();

  const { data: failed, error: failedError } = await admin
    .from('broadcast_recipients')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .eq('status', 'failed')
    .limit(5000);

  if (failedError) throw new Error(failedError.message);
  if (!failed?.length) throw new Error('אין שליחות שנכשלו בקמפיין הזה.');

  const now = Date.now();
  for (let i = 0; i < failed.length; i += 500) {
    const ids = failed.slice(i, i + 500).map((item) => item.id);
    const { error } = await admin
      .from('broadcast_recipients')
      .update({
        status: 'pending',
        retry_count: 0,
        error_text: null,
        claim_token: null,
        claimed_at: null,
        available_at: new Date(now + 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  }

  await admin
    .from('broadcast_campaigns')
    .update({
      status: 'active',
      failed_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('user_id', user.id);

  await writeAuditEvent({
    userId: user.id,
    eventType: 'broadcast_campaign.retry_failed',
    entityType: 'broadcast_campaign',
    entityId: campaignId,
    metadata: { recipients: failed.length },
  });

  revalidatePath('/broadcasts');
  revalidatePath(`/broadcasts/${campaignId}`);
  await wakeAutomationWorker();
}
