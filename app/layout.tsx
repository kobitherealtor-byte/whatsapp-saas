import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp Plus',
  description: 'מערכת לתזמון הודעות WhatsApp ופרסום אוטומטי לקבוצות',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}