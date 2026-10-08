import { NextResponse } from 'next/server';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { getNextAutomationRunAt } from '@/lib/automation-next';
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

  try {
    assertAutomationSecret(request);

    const secret = process.env.AUTOMATION_SHARED_SECRET!;
    const origin = new URL(request.url).origin;
    const body = (await request.json().catch(() => ({}))) as {
      personalLimit?: number;
      campaignLimit?: number;
      groupLimit?: number;
    };

    const personalClaim = await postJson<{ jobs: PersonalJob[] }>(
      `${origin}/api/automation/messages/claim`,
      secret,
      { limit: body.personalLimit ?? 25 },
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

    const campaignClaim = await postJson<{ jobs: GroupJob[] }>(
      `${origin}/api/automation/campaigns/claim`,
      secret,
      {
        campaignLimit: body.campaignLimit ?? 10,
        dispatchLimit: body.groupLimit ?? 50,
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
      nextRunAt,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    return NextResponse.json(
      {
        ok: false,
        error: message,
        durationMs: Date.now() - startedAt,
      },
      { status: message === 'unauthorized' ? 401 : 500 },
    );
  }
}
