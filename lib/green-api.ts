import 'server-only';

export class GreenApiInstanceNotFoundError extends Error {
  constructor() {
    super('green_api_instance_not_found');
    this.name = 'GreenApiInstanceNotFoundError';
  }
}

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

  const instance = {
    idInstance: String(data.idInstance),
    apiTokenInstance: data.apiTokenInstance,
    apiUrl: data.apiUrl.replace(/\/$/, ''),
    mediaUrl: data.mediaUrl ?? null,
  };

  await setGreenApiSettings({
    ...instance,
    webhookUrl: process.env.GREEN_API_WEBHOOK_URL?.trim() || null,
    webhookToken: process.env.GREEN_API_WEBHOOK_TOKEN?.trim() || null,
  });

  return instance;
}

export async function setGreenApiSettings(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  webhookUrl?: string | null;
  webhookToken?: string | null;
}) {
  const body: Record<string, string | number> = {
    delaySendMessagesMilliseconds: 3000,
    markIncomingMessagesReaded: 'no',
    markIncomingMessagesReadedOnReply: 'yes',
    outgoingWebhook: 'yes',
    outgoingMessageWebhook: 'yes',
    outgoingAPIMessageWebhook: 'yes',
    incomingWebhook: 'yes',
    stateWebhook: 'yes',
    pollMessageWebhook: 'yes',
    incomingCallWebhook: 'yes',
    editedMessageWebhook: 'no',
    deletedMessageWebhook: 'no',
    keepOnlineStatus: 'no',
  };

  if (input.webhookUrl) {
    body.webhookUrl = input.webhookUrl;
    body.webhookUrlToken = input.webhookToken
      ? `Bearer ${input.webhookToken}`
      : '';
  }

  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/setSettings/${input.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    },
  );

  const raw = await response.text();
  let data: { saveSettings?: boolean; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok || data.saveSettings === false) {
    throw new Error(
      data.message || `GREEN API setSettings failed with HTTP ${response.status}`,
    );
  }

  return true;
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

  if (response.status === 404) {
    throw new GreenApiInstanceNotFoundError();
  }

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
    type?: 'user' | 'group' | string;
    unreadCount?: number;
    ephemeralExpiration?: number;
    ephemeralSettingTimestamp?: number;
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


export async function rebootGreenApiInstance(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/reboot/${input.apiTokenInstance}`,
    { method: 'GET', cache: 'no-store' },
  );

  const raw = await response.text();
  let data: { isReboot?: boolean; message?: string } = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok || data.isReboot !== true) {
    throw new Error(
      data.message || `GREEN API reboot failed with HTTP ${response.status}`,
    );
  }

  return true;
}


export async function getChatHistory(input: {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
  chatId: string;
  count?: number;
}) {
  const response = await fetch(
    `${input.apiUrl.replace(/\/$/, '')}/waInstance${input.idInstance}/getChatHistory/${input.apiTokenInstance}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        chatId: input.chatId,
        count: Math.max(1, Math.min(input.count ?? 50, 100)),
      }),
    },
  );

  const raw = await response.text();
  let data: unknown = [];

  try {
    data = raw ? JSON.parse(raw) : [];
  } catch {
    throw new Error('Failed to parse WhatsApp chat history.');
  }

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Failed to load WhatsApp chat history.');
  }

  return data as Array<{
    idMessage?: string;
    timestamp?: number;
    type?: string;
    typeMessage?: string;
    chatId?: string;
    senderId?: string;
    senderName?: string;
    textMessage?: string;
    extendedTextMessage?: { text?: string };
    caption?: string;
    downloadUrl?: string;
    statusMessage?: string;
  }>;
}
