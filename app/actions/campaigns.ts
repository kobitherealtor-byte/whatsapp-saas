'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { nextCampaignRun } from '@/lib/timezone';
import { wakeAutomationWorker } from '@/lib/automation-wake';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error('צריך להתחבר למערכת.');
  return { supabase, user };
}

export async function createGroupCampaign(input: {
  name: string;
  message: string;
  groupIds: string[];
  daysOfWeek: number[];
  sendTime: string;
  startDate: string;
  endDate: string;
  skipHolidays: boolean;
  mediaUrl?: string;
}) {
  const { supabase, user } = await requireUser();

  if (!input.name.trim()) throw new Error('שם הקמפיין חסר.');
  if (!input.message.trim()) throw new Error('תוכן ההודעה חסר.');
  if (input.groupIds.length === 0) throw new Error('צריך לבחור לפחות קבוצה אחת.');
  if (input.daysOfWeek.length === 0) throw new Error('צריך לבחור לפחות יום פרסום אחד.');
  if (!/^\d{2}:\d{2}$/.test(input.sendTime)) throw new Error('שעת הפרסום אינה תקינה.');
  if (!input.startDate) throw new Error('תאריך ההתחלה חסר.');

  const uniqueDays = [...new Set(input.daysOfWeek)].sort((a, b) => a - b);
  if (uniqueDays.some((day) => day < 0 || day > 6)) {
    throw new Error('ימי הפרסום אינם תקינים.');
  }

  if (input.endDate && input.endDate < input.startDate) {
    throw new Error('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.');
  }

  const { data: groups, error: groupsError } = await supabase
    .from('whatsapp_groups')
    .select('id')
    .in('id', input.groupIds);

  if (groupsError) throw new Error(groupsError.message);
  if ((groups ?? []).length !== input.groupIds.length) {
    throw new Error('אחת הקבוצות שנבחרו אינה זמינה בחשבון שלך.');
  }

  const nextRunAt = nextCampaignRun(
    uniqueDays,
    input.sendTime,
    new Date(),
    input.startDate,
    input.endDate || null,
  );

  if (!nextRunAt) {
    throw new Error('אין מועד פרסום עתידי בטווח התאריכים שנבחר.');
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('group_campaigns')
    .insert({
      user_id: user.id,

      // New normalized columns
      name: input.name.trim(),
      message_body: input.message.trim(),
      media_url: input.mediaUrl?.trim() || null,
      days_of_week: uniqueDays,
      send_time: input.sendTime,
      timezone: 'Asia/Jerusalem',
      start_date: input.startDate,
      end_date: input.endDate || null,
      skip_holidays: input.skipHolidays,
      status: 'active',
      next_run_at: nextRunAt,

      // Legacy compatibility columns
      campaign_name: input.name.trim(),
      file_url: input.mediaUrl?.trim() || null,
      allowed_days: uniqueDays,
      dispatch_time: input.sendTime,
    })
    .select('id')
    .single();

  if (campaignError) throw new Error(campaignError.message);

  const { error: relationError } = await supabase
    .from('campaign_groups')
    .insert(input.groupIds.map((groupId) => ({
      campaign_id: campaign.id,
      group_id: groupId,
    })));

  if (relationError) {
    await supabase.from('group_campaigns').delete().eq('id', campaign.id);
    throw new Error(relationError.message);
  }

  revalidatePath('/publisher');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}

export async function setCampaignStatus(
  id: string,
  status: 'active' | 'paused' | 'cancelled',
) {
  const { supabase, user } = await requireUser();

  const payload: Record<string, string | number | null> = { status };

  if (status === 'active') {
    const { data: campaign, error } = await supabase
      .from('group_campaigns')
      .select('days_of_week, send_time, start_date, end_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !campaign) throw new Error('הקמפיין לא נמצא.');
    const nextRun = nextCampaignRun(
      campaign.days_of_week ?? [],
      campaign.send_time,
      new Date(),
      campaign.start_date,
      campaign.end_date,
    );
    if (!nextRun) throw new Error('אין מועד פרסום עתידי לקמפיין.');
    payload.next_run_at = nextRun;
    payload.prepare_fail_count = 0;
    payload.last_error = null;
  }

  if (status === 'cancelled') {
    payload.next_run_at = null;
  }

  const { error } = await supabase
    .from('group_campaigns')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/publisher');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}


export async function updateGroupCampaign(
  id: string,
  input: {
    name: string;
    message: string;
    mediaUrl?: string;
    groupIds: string[];
    daysOfWeek: number[];
    sendTime: string;
    startDate: string;
    endDate: string;
    skipHolidays: boolean;
  },
) {
  const { supabase, user } = await requireUser();

  if (!input.name.trim()) throw new Error('שם הקמפיין חסר.');
  if (!input.message.trim()) throw new Error('תוכן ההודעה חסר.');
  if (input.groupIds.length === 0) throw new Error('צריך לבחור לפחות קבוצה אחת.');
  if (input.daysOfWeek.length === 0) throw new Error('צריך לבחור לפחות יום פרסום אחד.');
  if (!/^\d{2}:\d{2}$/.test(input.sendTime)) throw new Error('שעת הפרסום אינה תקינה.');
  if (!input.startDate) throw new Error('תאריך ההתחלה חסר.');
  if (input.endDate && input.endDate < input.startDate) {
    throw new Error('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.');
  }

  const uniqueDays = [...new Set(input.daysOfWeek)].sort((a, b) => a - b);

  const { data: existing, error: existingError } = await supabase
    .from('group_campaigns')
    .select('status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (existingError || !existing) throw new Error('הקמפיין לא נמצא.');
  if (!['active', 'paused'].includes(existing.status)) {
    throw new Error('אי אפשר לערוך קמפיין שהסתיים או בוטל.');
  }

  const { data: groups, error: groupsError } = await supabase
    .from('whatsapp_groups')
    .select('id')
    .in('id', input.groupIds);

  if (groupsError) throw new Error(groupsError.message);
  if ((groups ?? []).length !== input.groupIds.length) {
    throw new Error('אחת הקבוצות שנבחרו אינה זמינה בחשבון שלך.');
  }

  const nextRunAt =
    existing.status === 'active'
      ? nextCampaignRun(
          uniqueDays,
          input.sendTime,
          new Date(),
          input.startDate,
          input.endDate || null,
        )
      : null;

  if (existing.status === 'active' && !nextRunAt) {
    throw new Error('אין מועד פרסום עתידי בטווח התאריכים שנבחר.');
  }

  const { error: updateError } = await supabase
    .from('group_campaigns')
    .update({
      name: input.name.trim(),
      message_body: input.message.trim(),
      media_url: input.mediaUrl?.trim() || null,
      days_of_week: uniqueDays,
      send_time: input.sendTime,
      start_date: input.startDate,
      end_date: input.endDate || null,
      skip_holidays: input.skipHolidays,
      next_run_at: nextRunAt,
      campaign_name: input.name.trim(),
      file_url: input.mediaUrl?.trim() || null,
      allowed_days: uniqueDays,
      dispatch_time: input.sendTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) throw new Error(updateError.message);

  const { error: deleteRelationsError } = await supabase
    .from('campaign_groups')
    .delete()
    .eq('campaign_id', id);

  if (deleteRelationsError) throw new Error(deleteRelationsError.message);

  const { error: relationError } = await supabase
    .from('campaign_groups')
    .insert(input.groupIds.map((groupId) => ({
      campaign_id: id,
      group_id: groupId,
    })));

  if (relationError) throw new Error(relationError.message);

  revalidatePath('/publisher');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  await wakeAutomationWorker();
}
