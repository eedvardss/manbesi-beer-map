import { createClerkClient } from '@clerk/backend';
import { database, closeDatabase } from '../lib/database';

// Run only with the database-owner connection, never an HTTP database role.
const [action, userId] = process.argv.slice(2);
if (
  !['grant', 'revoke'].includes(action) ||
  !/^user_[A-Za-z0-9]+$/.test(userId ?? '')
)
  throw new Error('Usage: npm run db:admin -- grant|revoke user_...');
try {
  if (action === 'grant') {
    if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))
      throw new Error('Development Clerk secret required');
    const user = await createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    }).users.getUser(userId);
    if (
      !user.passwordEnabled ||
      !user.totpEnabled ||
      user.banned ||
      user.locked
    )
      throw new Error(
        'An active account with password and authenticator MFA is required',
      );
    await database().query(
      'INSERT INTO beer_map_admins(clerk_user_id) VALUES($1) ON CONFLICT(clerk_user_id) DO UPDATE SET active=true,changed_at=now()',
      [userId],
    );
  } else {
    await database().query(
      'UPDATE beer_map_admins SET active=false,changed_at=now() WHERE clerk_user_id=$1',
      [userId],
    );
  }
  console.log(`Admin access ${action === 'grant' ? 'granted' : 'revoked'}`);
} finally {
  await closeDatabase();
}
