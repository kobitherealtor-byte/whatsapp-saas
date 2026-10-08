import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { dateKeyInTimeZone, nextCampaignRun } from '@/lib/timezone';

type ClaimedCampaign = {
  id: string;
  user_id: string;
  name: string | null;
  message_body: string;
  media_url: string | null;
  days_of_week: number[] | null;
  send_time: string | null;
  timezone: string | null;
  start_date: string;
  end_date: string | null;
  skip_holidays: boolean | null;
  next_run_at: string;
  dispatch_claim_token: string;
};

type ClaimedDispatch = {
  id: string;
  campaign_id: string;
  user_id: string;
  group_id: string;
  scheduled_for: string;
  message_body: string;
  media_url: string | null;
  destination_chat_id: string;
  claim_token: string;
};

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);

    const body = (await request.json().catch(() => ({}))) as {
      campaignLimit?: number;
      dispatchLimit?: number;
    };

    const campaignLimit = Math.max(
      1,
      Math.min(Number(body.campaignLimit) || 10, 50),
    );
    const dispatchLimit = Math.max(
      1,
      Math.min(Number(body.dispatchLimit) || 50, 100),
    );

    const admin = createAdminClient();

    await admin.rpc('recover_stale_campaign_claims');
    await admin.rpc('recover_stale_campaign_dispatches');

    const { data: claimedCampaigns, error: campaignClaimError } =
      await admin.rpc('claim_due_campaigns', {
        p_limit: campaignLimit,
      });

    if (campaignClaimError) throw campaignClaimError;

    const campaigns = (claimedCampaigns ?? []) as ClaimedCampaign[];

    if (campaigns.length > 0) {
      const campaignIds = campaigns.map((campaign) => campaign.id);

      const { data: relations, error: relationError } = await admin
        .from('campaign_groups')
        .select('campaign_id, group_id')
        .in('campaign_id', campaignIds);

      if (relationError) throw relationError;

      const groupIds = [
        ...new Set((relations ?? []).map((row) => row.group_id as string)),
      ];

      const { data: groups, error: groupsError } = groupIds.length
        ? await admin
            .from('whatsapp_groups')
            .select('id, user_id, chat_id, name, is_active')
            .in('id', groupIds)
        : { data: [], error: null };

      if (groupsError) throw groupsError;

      const groupsById = new Map(
        (groups ?? []).map((group) => [group.id as string, group]),
      );

      const relationsByCampaign = new Map<string, string[]>();
      for (const relation of relations ?? []) {
        const campaignId = relation.campaign_id as string;
        const groupId = relation.group_id as string;
        const list = relationsByCampaign.get(campaignId) ?? [];
        list.push(groupId);
        relationsByCampaign.set(campaignId, list);
      }

      const holidayKeys = [
        ...new Set(
          campaigns
            .filter((campaign) => campaign.skip_holidays)
            .map((campaign) =>
              dateKeyInTimeZone(
                campaign.next_run_at,
                campaign.timezone || 'Asia/Jerusalem',
              ),
            ),
        ),
      ];

      const { data: holidays, error: holidayError } = holidayKeys.length
        ? await admin
            .from('holiday_dates')
            .select('holiday_date, name')
            .in('holiday_date', holidayKeys)
        : { data: [], error: null };

      if (holidayError) throw holidayError;

      const holidaysByDate = new Map(
        (holidays ?? []).map((holiday) => [
          holiday.holiday_date as string,
          holiday.name as string,
        ]),
      );

      for (const campaign of campaigns) {
        try {
          const scheduledFor = campaign.next_run_at;
          const timeZone = campaign.timezone || 'Asia/Jerusalem';
          const dateKey = dateKeyInTimeZone(scheduledFor, timeZone);
          const holidayName = campaign.skip_holidays
            ? holidaysByDate.get(dateKey)
            : undefined;

          const campaignGroupIds = relationsByCampaign.get(campaign.id) ?? [];
          const activeGroups = campaignGroupIds
            .map((groupId) => groupsById.get(groupId))
            .filter(
              (group): group is NonNullable<typeof group> =>
                Boolean(group?.is_active && group?.chat_id),
            );

          if (holidayName) {
            if (activeGroups.length > 0) {
              const skipLogs = activeGroups.map((group) => ({
                user_id: campaign.user_id,
                entity_type: 'group_campaign',
                entity_id: campaign.id,
                recipient_id: group.chat_id,
                status: 'skipped',
                error_message: null,
                sent_at: null,
                kind: 'group_campaign',
                ref_id: campaign.id,
                destination: group.chat_id,
                detail: `Holiday Guard: ${holidayName}`,
                external_message_id: null,
                created_at: new Date().toISOString(),
              }));

              const { error: skipError } = await admin
                .from('send_logs')
                .insert(skipLogs);

              if (skipError) throw skipError;
            }
          } else if (activeGroups.length > 0) {
            const dispatchRows = activeGroups.map((group) => ({
              campaign_id: campaign.id,
              user_id: campaign.user_id,
              group_id: group.id,
              scheduled_for: scheduledFor,
              message_body: campaign.message_body,
              media_url: campaign.media_url,
              destination_chat_id: group.chat_id,
              status: 'pending',
            }));

            const { error: dispatchError } = await admin
              .from('campaign_dispatches')
              .upsert(dispatchRows, {
                onConflict: 'campaign_id,group_id,scheduled_for',
                ignoreDuplicates: true,
              });

            if (dispatchError) throw dispatchError;
          }

          const nextRun = nextCampaignRun(
            campaign.days_of_week ?? [],
            campaign.send_time ?? '00:00',
            new Date(new Date(scheduledFor).getTime() + 1000),
            campaign.start_date,
            campaign.end_date,
          );

          const { error: releaseError } = await admin.rpc(
            'release_campaign_claim',
            {
              p_campaign_id: campaign.id,
              p_claim_token: campaign.dispatch_claim_token,
              p_next_run_at: nextRun,
              p_last_run_at: scheduledFor,
              p_status: nextRun ? 'active' : 'completed',
              p_last_error: null,
            },
          );

          if (releaseError) throw releaseError;
        } catch (campaignError) {
          const message =
            campaignError instanceof Error
              ? campaignError.message
              : 'campaign_prepare_failed';

          await admin.rpc('release_campaign_claim', {
            p_campaign_id: campaign.id,
            p_claim_token: campaign.dispatch_claim_token,
            p_next_run_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            p_last_run_at: campaign.next_run_at,
            p_status: 'active',
            p_last_error: message,
          });
        }
      }
    }

    const { data: claimedDispatches, error: dispatchClaimError } =
      await admin.rpc('claim_pending_campaign_dispatches', {
        p_limit: dispatchLimit,
      });

    if (dispatchClaimError) throw dispatchClaimError;

    const dispatches = (claimedDispatches ?? []) as ClaimedDispatch[];

    if (dispatches.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const userIds = [...new Set(dispatches.map((job) => job.user_id))];

    const { data: credentials, error: credentialError } = await admin
      .from('green_api_credentials')
      .select('user_id, id_instance, api_token_instance, api_url')
      .in('user_id', userIds);

    if (credentialError) throw credentialError;

    const credentialsByUser = new Map(
      (credentials ?? []).map((credential) => [
        credential.user_id as string,
        credential,
      ]),
    );

    const jobs = dispatches.map((dispatch) => {
      const credential = credentialsByUser.get(dispatch.user_id);

      return {
        id: dispatch.id,
        campaignId: dispatch.campaign_id,
        claimToken: dispatch.claim_token,
        groupId: dispatch.group_id,
        chatId: dispatch.destination_chat_id,
        message: dispatch.message_body,
        mediaUrl: dispatch.media_url,
        scheduledFor: dispatch.scheduled_for,
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
