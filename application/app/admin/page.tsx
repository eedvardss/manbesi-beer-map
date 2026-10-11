import Link from 'next/link';
import AdminAuth from './auth';
import { clerkDevelopmentConfig } from '../../lib/clerk-config';
export const metadata = {
  title: 'Administrēšana · Rīgas alus',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function AdminPage() {
  const config = clerkDevelopmentConfig();
  if (!config)
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <Link href="/">← Rīgas alus karte</Link>
          <h1>Administrēšana nav pieejama</h1>
          <p>Clerk izstrādes autentifikācija nav konfigurēta.</p>
        </section>
      </main>
    );
  return <AdminAuth publishableKey={config.publishableKey} />;
}
