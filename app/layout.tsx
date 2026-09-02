import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rīgas alus karte — reālas cenas un avoti',
  description: '30 Rīgas bāri kartē ar publicētām alus cenām, tilpumiem un pārbaudāmiem avotiem.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lv">
      <body>{children}</body>
    </html>
  );
}
