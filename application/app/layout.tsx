import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://aluskarte.lv'),
  title: 'Rīgas alus karte — reālas cenas un avoti',
  description: 'Rīgas bāri un restorāni kartē ar publicētām alus cenām, tilpumiem un pārbaudāmiem avotiem.',
  alternates: { canonical: 'https://aluskarte.lv/' },
  referrer: 'no-referrer',
  openGraph: {
    type: 'website',
    locale: 'lv_LV',
    siteName: 'Aluskarte.lv',
    url: 'https://aluskarte.lv/',
    title: 'Rīgas alus karte — reālas cenas un avoti',
    description: 'Atrodi Rīgas alus vietas un salīdzini īstas porcijas, cenas un avotus.',
  },
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
