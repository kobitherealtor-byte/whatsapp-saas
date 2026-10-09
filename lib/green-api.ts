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


export async function getWaSettings(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/getWaSettings/${input.apiTokenInstance}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error('Failed to read WhatsApp account settings.');
  }

  return (await response.json()) as {
    phone?: string;
    stateInstance?: string;
    chatId?: string;
  };
}

export async function getChats(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/getChats/${input.apiTokenInstance}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error('Failed to load WhatsApp chats.');
  }

  return (await response.json()) as Array<{
    id?: string;
    name?: string;
    archive?: boolean;
  }>;
}


export function normalizePersonalChatId(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) throw new Error('Invalid recipient phone number.');

  if (digits.startsWith('0')) {
    return `972${digits.slice(1)}@c.us`;
  }

  return `${digits}@c.us`;
}

export async function sendGreenApiText(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  chatId: string;
  message: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/sendMessage/${input.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        chatId: input.chatId,
        message: input.message,
      }),
    },
  );

  const raw = await response.text();
  let data: { idMessage?: string; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok || !data.idMessage) {
    throw new Error(
      data.message || `GREEN API sendMessage failed with HTTP ${response.status}`,
    );
  }

  return data.idMessage;
}

export async function sendGreenApiFileByUrl(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  chatId: string;
  urlFile: string;
  caption?: string;
}) {
  const parsedUrl = new URL(input.urlFile);
  const rawFileName = parsedUrl.pathname.split('/').filter(Boolean).pop();
  const fileName = rawFileName ? decodeURIComponent(rawFileName) : 'file.bin';

  if (!fileName.includes('.')) {
    throw new Error('Media URL must include a file extension.');
  }

  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/sendFileByUrl/${input.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        chatId: input.chatId,
        urlFile: input.urlFile,
        fileName,
        caption: input.caption || undefined,
      }),
    },
  );

  const raw = await response.text();
  let data: { idMessage?: string; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok || !data.idMessage) {
    throw new Error(
      data.message || `GREEN API sendFileByUrl failed with HTTP ${response.status}`,
    );
  }

  return data.idMessage;
}


export async function logoutGreenApiInstance(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/logout/${input.apiTokenInstance}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );

  const raw = await response.text();
  let data: { isLogout?: boolean; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok || data.isLogout !== true) {
    throw new Error(
      data.message || `GREEN API logout failed with HTTP ${response.status}`,
    );
  }

  return true;
}
