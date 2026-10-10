export type MessageStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export const scheduledMessages = [
  { id: '1', name: 'יוסי כהן', phone: '0501234567', body: 'תזכורת: הפגישה שלנו מחר בשעה 10:00', time: '12/10/2026 10:00', status: 'pending' as MessageStatus },
  { id: '2', name: 'מיכל לוי', phone: '0529876543', body: 'חג שמח מיכל! מצורף הקופון שלך', time: '05/10/2026 16:00', status: 'sent' as MessageStatus },
  { id: '3', name: 'אבי ארז', phone: '0541112223', body: 'החשבונית החודשית מוכנה', time: '01/10/2026 09:00', status: 'failed' as MessageStatus },
];

export const groupCampaigns = [
  { id: 'c1', name: 'מבצע סוף שבוע', groups: 8, schedule: 'א׳, ד׳ · 10:30', nextRun: '11/10/2026 10:30', status: 'active' },
  { id: 'c2', name: 'עדכון שבועי', groups: 3, schedule: 'ג׳ · 09:15', nextRun: '13/10/2026 09:15', status: 'active' },
  { id: 'c3', name: 'קמפיין ספטמבר', groups: 12, schedule: 'ב׳, ה׳ · 12:00', nextRun: 'הסתיים', status: 'paused' },
];