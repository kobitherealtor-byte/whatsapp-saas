import 'server-only';

type CreateInstanceResponse = {
  apiTokenInstance?: string;
  apiUrl?: string;
  idInstance?: number | string;
  mediaUrl?: string;
  typeInstance?: string;
  code?: number;
  description?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function createPartnerInstance(name: string) {
  const partnerApiUrl = requiredEnv('GREEN_API_PARTNER_API_URL').replace(/\/$/, '');
  const partnerToken = requiredEnv('GREEN_API_PARTNER_TOKEN');

  const response = await fetch(
    `${partnerApiUrl}/partner/createInstance/${partnerToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        name,
        delaySendMessagesMilliseconds: 3000,
        markIncomingMessagesReaded: 'no',
        markIncomingMessagesReadedOnReply: 'yes',
        outgoingWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
        outgoingAPIMessageWebhook: 'yes',
        incomingWebhook: 'yes',
        stateWebhook: 'yes',
        keepOnlineStatus: 'no',
        pollMessageWebhook: 'yes',
        incomingCallWebhook: 'yes',
        editedMessageWebhook: 'no',
        deletedMessageWebhook: 'no',
      }),
    },
  );

  const data = (await response.json()) as CreateInstanceResponse;

  if (
    !response.ok ||
    data.code ||
    !data.idInstance ||
    !data.apiTokenInstance ||
    !data.apiUrl
  ) {
    throw new Error(data.description || 'GREEN API instance creation failed.');
  }

  return {
    idInstance: String(data.idInstance),
    apiTokenInstance: data.apiTokenInstance,
    apiUrl: data.apiUrl.replace(/\/$/, ''),
    mediaUrl: data.mediaUrl ?? null,
  };
}

export async function getInstanceState(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/getStateInstance/${input.apiTokenInstance}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error('Failed to read GREEN API instance state.');
  }

  const raw = await response.text();
  if (!raw || raw === 'null') return null;

  const data = JSON.parse(raw) as { stateInstance?: string };
  return data.stateInstance ?? null;
}

export async function getQrCode(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/qr/${input.apiTokenInstance}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error('Failed to get GREEN API QR code.');
  }

  const data = (await response.json()) as {
    type?: string;
    message?: string;
  };

  if (data.type === 'qrCode' && data.message) {
    return {
      type: data.type,
      dataUrl: `data:image/png;base64,${data.message}`,
    };
  }

  return {
    type: data.type ?? 'unknown',
    message: data.message ?? null,
  };
}
