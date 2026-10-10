import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireAdminFactors } from '../lib/admin-policy';
import { clerkDevelopmentConfig } from '../lib/clerk-config';
import { requireReviewer } from '../lib/admin-auth';
import { POST as legacyLogin } from '../app/api/price-review/session/route';

await test('pending, missing, partial and malformed MFA claims are rejected', () => {
  for (const claims of [
    {},
    { sts: 'pending', fva: [0, 0] },
    { fva: [0, -1] },
    { fva: [-1, 0] },
    { fva: [0] },
    { fva: [0, '0'] },
    { fva: [NaN, 0] },
    { fva: [0, 0, 0] },
  ])
    assert.throws(() => requireAdminFactors(claims));
  requireAdminFactors({ fva: [0, 0] });
  requireAdminFactors({ fva: [9, 9] }, true);
  for (const fva of [
    [10, 0],
    [0, 10],
    [100, 100],
  ])
    assert.throws(() => requireAdminFactors({ fva }, true));
});
await test('development config rejects live keys and foreign or non-canonical origins', async () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, {
      CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      CLERK_SECRET_KEY: 'sk_test_example',
      PRICE_ALLOWED_ORIGIN: 'http://localhost:3010',
      PRICE_SUGGESTIONS_ENABLED: 'true',
      DATABASE_URL: 'postgresql://test',
      DATABASE_REVIEW_URL: 'postgresql://test',
      PRICE_SESSION_SECRET: 's'.repeat(64),
    });
    assert(clerkDevelopmentConfig());
    for (const origin of [
      'http://example.com',
      'https://example.com/path',
      'https://user:pass@example.com',
    ]) {
      process.env.PRICE_ALLOWED_ORIGIN = origin;
      assert.equal(clerkDevelopmentConfig(), null);
    }
    process.env.PRICE_ALLOWED_ORIGIN = 'http://localhost:3010';
    await assert.rejects(
      requireReviewer(
        new Request('http://evil.example/api/price-review/suggestions'),
      ),
    );
    process.env.CLERK_SECRET_KEY = 'sk_live_example';
    assert.equal(clerkDevelopmentConfig(), null);
    await assert.rejects(
      requireReviewer(
        new Request('http://localhost:3010/api/price-review/suggestions', {
          headers: { cookie: 'bm_price_review=review.forged' },
        }),
      ),
    );
    assert.equal((await legacyLogin()).status, 410);
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
