export const FEATURE_KEYS = [
  'scheduler',
  'group_publisher',
  'broadcasts',
  'inbox',
  'embedded_inbox',
  'holiday_guard',
  'media_upload',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  scheduler: 'הודעות מתוזמנות',
  group_publisher: 'פרסום לקבוצות',
  broadcasts: 'קמפייני תפוצה',
  inbox: 'WhatsApp Inbox',
  embedded_inbox: 'WhatsApp Embedded',
  holiday_guard: 'Holiday Guard',
  media_upload: 'שליחת מדיה',
};
