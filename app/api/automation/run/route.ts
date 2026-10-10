import { NextResponse } from 'next/server';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { getNextAutomationRunAt } from '@/lib/automation-next';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  normalizePersonalChatId,
  sendGreenApiFileByUrl,
  sendGreenApiText,
} from '@/lib/green-api';

type Connection = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

type PersonalJob = {
  id: string;
  claimToken: string;
  recipientNumber: string;
  message: string;
  mediaUrl: string | null;
  connection: Connection | null;
};

type BroadcastJob = {
  id: string;
  claimToken: string;
  recipientName: string | null;
  recipientNumber: string;
  message: string;
  mediaUrl: string | null;
  delaySeconds: number;
  connection: Connection | null;
};

type GroupJob = {
  id: string;
  claimToken: string;
  chatId: string;
  message: string;
  mediaUrl: string | null;
  connection: Connection | null;
};

async function postJson<T>(
  url: string,
  secret: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-automation-secret': secret,
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Automation endpoint failed: ${response.status}`);
  }

  return data;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderBroadcastMessage(message: string, recipientName: string | null) {
  const name = recipientName?.trim() || '';
  return message
    .replaceAll('{{name}}', name)
    .replaceAll('{{שם}}', name);
}

async function sendJob(
  job: {
    chatId: string;
    message: string;
    mediaUrl: string | null;
    connection: Connection | null;
  },
) {
  if (!job.connection) {
    throw new Error('WhatsApp connection is missing.');
  }

  if (job.mediaUrl) {
    return sendGreenApiFileByUrl({
      ...job.connection,
      chatId: job.chatId,
      urlFile: job.mediaUrl,
      caption: job.message,
    });
  }

  return sendGreenApiText({
    ...job.connection,
    chatId: job.chatId,
    message: job.message,
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let runId: string | null = null;

  try {
    assertAutomationSecret(request);

    const admin = createAdminClient();
    const { data: runLog } = await admin
      .from('automation_runs')
      .insert({ status: 'running' })
      .select('id')
      .single();

    runId = runLog?.id ?? null;

    const secret = process.env.AUTOMATION_SHARED_SECRET!;
    const origin = new URL(request.url).origin;
    const body = (await request.json().catch(() => ({}))) as {
      personalLimit?: number;
      campaignLimit?: number;
      groupLimit?: number;
      broadcastLimit?: number;
    };

    const personalClaim = await postJson<{ jobs: PersonalJob[] }>(
      `${origin}/api/automation/messages/claim`,
      secret,
      { limit: body.personalLimit ?? 10 },
    );

    let personalSent = 0;
    let personalFailed = 0;

    for (const job of personalClaim.jobs) {
      try {
        const idMessage = await sendJob({
          chatId: normalizePersonalChatId(job.recipientNumber),
          message: job.message,
          mediaUrl: job.mediaUrl,
          connection: job.connection,
        });

        await postJson(
          `${origin}/api/automation/messages/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: true,
            externalMessageId: idMessage,
          },
        );

        personalSent += 1;
      } catch (sendError) {
        await postJson(
          `${origin}/api/automation/messages/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: false,
            error:
              sendError instanceof Error
                ? sendError.message
                : 'personal_send_failed',
          },
        );

        personalFailed += 1;
      }
    }

    const broadcastClaim = await postJson<{ jobs: BroadcastJob[] }>(
      `${origin}/api/automation/broadcasts/claim`,
      secret,
      { limit: body.broadcastLimit ?? 10 },
    );

    let broadcastSent = 0;
    let broadcastFailed = 0;

    for (const [index, job] of broadcastClaim.jobs.entries()) {
      try {
        const idMessage = await sendJob({
          chatId: normalizePersonalChatId(job.recipientNumber),
          message: renderBroadcastMessage(job.message, job.recipientName),
          mediaUrl: job.mediaUrl,
          connection: job.connection,
        });

        await postJson(
          `${origin}/api/automation/broadcasts/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: true,
            externalMessageId: idMessage,
          },
        );

        broadcastSent += 1;
      } catch (sendError) {
        await postJson(
          `${origin}/api/automation/broadcasts/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: false,
            error:
              sendError instanceof Error
                ? sendError.message
                : 'broadcast_send_failed',
          },
        );

        broadcastFailed += 1;
      }

      if (index < broadcastClaim.jobs.length - 1) {
        await wait(Math.max(1, Math.min(job.delaySeconds || 3, 5)) * 1000);
      }
    }

    const campaignClaim = await postJson<{ jobs: GroupJob[] }>(
      `${origin}/api/automation/campaigns/claim`,
      secret,
      {
        campaignLimit: body.campaignLimit ?? 5,
        dispatchLimit: body.groupLimit ?? 10,
      },
    );

    let groupSent = 0;
    let groupFailed = 0;

    for (const job of campaignClaim.jobs) {
      try {
        const idMessage = await sendJob({
          chatId: job.chatId,
          message: job.message,
          mediaUrl: job.mediaUrl,
          connection: job.connection,
        });

        await postJson(
          `${origin}/api/automation/campaigns/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: true,
            externalMessageId: idMessage,
          },
        );

        groupSent += 1;
      } catch (sendError) {
        await postJson(
          `${origin}/api/automation/campaigns/result`,
          secret,
          {
            id: job.id,
            claimToken: job.claimToken,
            success: false,
            error:
              sendError instanceof Error
                ? sendError.message
                : 'group_send_failed',
          },
        );

        groupFailed += 1;
      }
    }

    const nextRunAt = await getNextAutomationRunAt();
    const durationMs = Date.now() - startedAt;

    if (runId) {
      await admin
        .from('automation_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'success',
          personal_claimed: personalClaim.jobs.length,
          personal_sent: personalSent,
          personal_failed: personalFailed,
          group_claimed: campaignClaim.jobs.length,
          group_sent: groupSent,
          group_failed: groupFailed,
          broadcast_claimed: broadcastClaim.jobs.length,
          broadcast_sent: broadcastSent,
          broadcast_failed: broadcastFailed,
          duration_ms: durationMs,
          error_text: null,
        })
        .eq('id', runId);
    }

    return NextResponse.json({
      ok: true,
      personal: {
        claimed: personalClaim.jobs.length,
        sent: personalSent,
        failed: personalFailed,
      },
      groups: {
        claimed: campaignClaim.jobs.length,
        sent: groupSent,
        failed: groupFailed,
      },
      broadcasts: {
        claimed: broadcastClaim.jobs.length,
        sent: broadcastSent,
        failed: broadcastFailed,
      },
      nextRunAt,
      durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const durationMs = Date.now() - startedAt;

    if (runId) {
      try {
        const admin = createAdminClient();
        await admin
          .from('automation_runs')
          .update({
            finished_at: new Date().toISOString(),
            status: 'failed',
            duration_ms: durationMs,
            error_text: message,
          })
          .eq('id', runId);
      } catch {
        // Preserve the original worker error even if logging fails.
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
        durationMs,
      },
      { status: message === 'unauthorized' ? 401 : 500 },
    );
  }
}
