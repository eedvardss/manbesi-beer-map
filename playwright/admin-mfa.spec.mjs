import { test, expect } from '../application/scripts/playwright-fixtures.mjs';
import { priceSuggestions } from './price-suggestions.mjs';
import { clerkMfaLogin } from '../application/scripts/clerk-mfa-login.mjs';

test.describe('Clerk Development MFA admin', () => {
  test.skip(!['VITE_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'CLERK_E2E_EMAIL', 'CLERK_E2E_PASSWORD', 'CLERK_E2E_TOTP_SECRET', 'CLERK_E2E_USER_ID'].every(key => process.env[key]),
    'Requires a dedicated pre-enrolled Development test account; no MFA bypass is used');
  test('Password and authenticator sign-in, approve, reject, revert and logout', async ({ browser, catalog }, testInfo) => {
    const userId = process.env.CLERK_E2E_USER_ID;
    if (!/^user_[A-Za-z0-9]+$/.test(userId)) throw new Error('Invalid test user ID');
    await catalog.db.query('INSERT INTO beer_map_admins(clerk_user_id) VALUES($1) ON CONFLICT(clerk_user_id) DO UPDATE SET active=true', [userId]);
    try {
      await priceSuggestions({browser, ...catalog, expect, artifacts: testInfo.outputDir,
        trace:false, signIn:page => clerkMfaLogin(page, expect)});
    } finally { await catalog.db.query('DELETE FROM beer_map_admins WHERE clerk_user_id=$1', [userId]); }
  });
});
