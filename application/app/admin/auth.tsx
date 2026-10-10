'use client';
import Link from 'next/link';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  UserButton,
} from '@clerk/react';
import { shadcn } from '@clerk/ui/themes';
import { useState } from 'react';
import AdminPanel from './panel';
import '@clerk/ui/themes/shadcn.css';

function AdminIdentity() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { signOut } = useClerk();
  const [register, setRegister] = useState(false);
  if (!isLoaded)
    return (
      <main className="admin-shell">
        <output>Pārbauda pieslēgšanos…</output>
      </main>
    );
  if (!isSignedIn)
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <Link href="/">← Rīgas alus karte</Link>
          <h1>Administratora pieslēgšanās</h1>
          <p>
            Pieslēdzies ar savu kontu un autentifikatora kodu. Konta izveide
            nepiešķir administratora tiesības.
          </p>
          {register ? (
            <SignUp routing="hash" forceRedirectUrl="/admin" />
          ) : (
            <SignIn routing="hash" forceRedirectUrl="/admin" />
          )}
          <button
            className="admin-secondary"
            onClick={() => setRegister(!register)}
          >
            {register ? 'Jau ir konts? Pieslēgties' : 'Izveidot kontu'}
          </button>
        </section>
      </main>
    );
  return (
    <>
      <div className="admin-identity">
        <UserButton />
      </div>
      <AdminPanel
        key={sessionId}
        signOut={() => signOut({ redirectUrl: '/admin' })}
      />
    </>
  );
}
export default function AdminAuth({
  publishableKey,
}: {
  publishableKey: string;
}) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        theme: shadcn,
        variables: {
          colorBackground: '#142019',
          colorForeground: '#edf2ee',
          colorMutedForeground: '#aebdb3',
          colorPrimary: '#c3dfca',
          colorPrimaryForeground: '#102016',
          colorInput: '#0c130e',
          colorInputForeground: '#edf2ee',
        },
        elements: {
          footerAction: { display: 'none' },
          formFieldInput: { width: '100%' },
          formButtonPrimary: { width: '100%' },
        },
      }}
      signInFallbackRedirectUrl="/admin"
      signUpFallbackRedirectUrl="/admin"
    >
      <AdminIdentity />
    </ClerkProvider>
  );
}
