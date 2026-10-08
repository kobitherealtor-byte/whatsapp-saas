'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createGroupCampaign(input: {
  name: string;
  message: string;
  groupIds: string[];
  daysOfWeek: number[];
  sendTime: string;
  startDate: string;
  endDate: string;
  skipHolidays: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('צריך להתחבר למערכת.');
  if (!input.name.trim()) throw new Error('שם הקמפיין חסר.');
  if (!input.message.trim()) throw new Error('תוכן ההודעה חסר.');
  if (input.groupIds.length === 0) throw new Error('צריך לבחור לפחות קבוצה אחת.');
  if (input.daysOfWeek.length === 0) throw new Error('צריך לבחור לפחות יום פרסום אחד.');
  if (!/^\d{2}:\d{2}$/.test(input.sendTime)) throw new Error('שעת הפרסום אינה תקינה.');
  if (!input.startDate) throw new Error('תאריך ההתחלה חסר.');

  const { data: groups, error: groupsError } = await supabase
    .from('whatsapp_groups')
    .select('id')
    .in('id', input.groupIds);

  if (groupsError) throw new Error(groupsError.message);
  if ((groups ?? []).length !== input.groupIds.length) {
    throw new Error('אחת הקבוצות שנבחרו אינה זמינה בחשבון שלך.');
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('group_campaigns')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      message_body: input.message.trim(),
      days_of_week: input.daysOfWeek,
      send_time: input.sendTime,
      start_date: input.startDate,
      end_date: input.endDate || null,
      skip_holidays: input.skipHolidays,
      status: 'active',
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
}
