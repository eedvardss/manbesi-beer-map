import { createHmac } from 'node:crypto';

function authenticatorCode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const input = secret.toUpperCase().replace(/[\s=]/g, '');
  if (!/^[A-Z2-7]+$/.test(input)) throw new Error('Invalid test authenticator secret');
  const bits = [...input].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}

// A dedicated Development identity completes the actual password + TOTP UI.
// Never use Clerk's email-only testing signIn helper: it bypasses MFA.
export async function clerkMfaLogin(page, expect) {
  await page.getByLabel('Email address', {exact: true}).fill(process.env.CLERK_E2E_EMAIL);
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('Password', {exact: true}).fill(process.env.CLERK_E2E_PASSWORD);
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  const code = page.locator('input[autocomplete="one-time-code"]').first();
  await expect(code).toBeVisible();
  await code.fill(authenticatorCode(process.env.CLERK_E2E_TOTP_SECRET));
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Cenu ieteikumi', exact: true})).toBeVisible();
}
