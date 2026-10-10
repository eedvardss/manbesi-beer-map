import { createClerkClient } from '@clerk/backend';
import { clerkDevelopmentConfig } from './clerk-config';
import { requireAdminFactors } from './admin-policy';
import { reviewDatabase } from './price-store';
import { requirePrices } from './price-auth';
import { PriceError } from './price-input';

export async function requireReviewer(request: Request, recent = false) {
  requirePrices();
  const config = clerkDevelopmentConfig();
  if (!config)
    throw new PriceError(
      503,
      'Clerk izstrādes autentifikācija nav konfigurēta.',
    );
  // Reject foreign Host/Origin values; do not trust client-supplied identity headers.
  if (new URL(request.url).origin !== config.origin)
    throw new PriceError(403, 'Nederīga vietnes adrese.');
  const clerk = createClerkClient({
    secretKey: config.secretKey,
    publishableKey: config.publishableKey,
  });
  const state = await clerk.authenticateRequest(request, {
    acceptsToken: 'session_token',
    authorizedParties: [config.origin],
  });
  const auth = state.toAuth();
  if (!state.isAuthenticated || !auth?.userId || !auth.sessionId) {
    throw new PriceError(401, 'Nepieciešama administratora pieslēgšanās.');
  }
  requireAdminFactors(auth.sessionClaims, recent);
  const { rowCount } = await reviewDatabase().query(
    'SELECT 1 FROM beer_map_admins WHERE clerk_user_id=$1 AND active=true',
    [auth.userId],
  );
  if (!rowCount)
    throw new PriceError(403, 'Šim kontam nav administratora tiesību.');
  // JWT validity alone does not prove that a session has not since been revoked.
  const [session, user] = await Promise.all([
    clerk.sessions.getSession(auth.sessionId),
    clerk.users.getUser(auth.userId),
  ]);
  if (
    session.status !== 'active' ||
    session.userId !== auth.userId ||
    user.banned ||
    user.locked
  ) {
    throw new PriceError(401, 'Sesija beigusies. Pieslēdzies vēlreiz.');
  }
  if (!user.passwordEnabled || !user.totpEnabled)
    throw new PriceError(
      403,
      'Administratoram nepieciešama parole un autentifikatora lietotne.',
    );
  return auth.userId;
}
