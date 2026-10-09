import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePrice, evidenceUrl, observedDate } from '../lib/price-input';
import { servingId } from '../lib/serving-id';
import { catalog } from '../app/catalog';
import {
  sessionToken,
  sessionCookie,
  requireReviewer,
  sameOrigin,
  visitor,
  correctPassword,
  pricesEnabled,
} from '../lib/price-auth';

await test('prices are exact cents; invalid and ambiguous input is rejected', () => {
  for (const [input, cents] of [
    ['4,50', 450],
    ['4.5', 450],
    ['0.01', 1],
    ['500', 50000],
  ] as const)
    assert.equal(parsePrice(input), cents);
  for (const input of [
    '0',
    '-1',
    '4.501',
    '1e2',
    'Infinity',
    '1,000.00',
    '500.01',
    4.5,
    null,
  ])
    assert.throws(() => parsePrice(input));
  assert.equal(
    evidenceUrl('https://example.com/menu'),
    'https://example.com/menu',
  );
  for (const url of [
    'javascript:alert(1)',
    'https://user:password@example.com',
    'data:text/html,a',
  ])
    assert.throws(() => evidenceUrl(url));
  for (const date of ['2026-02-30', '2099-01-01', '2026-1-1'])
    assert.throws(() => observedDate(date));
});
await test('serving identity survives price edits and reordering, and distinguishes volumes and multipacks', () => {
  const beer = { name: 'Alus', volumeMl: 500, price: 4 };
  const changed = { ...beer, price: 5 };
  assert.equal(servingId('venue', beer), servingId('venue', changed));
  assert.notEqual(
    servingId('venue', beer),
    servingId('venue', { ...beer, volumeMl: 300 }),
  );
  assert.notEqual(
    servingId('venue', beer),
    servingId('venue', { ...beer, packageCount: 2 }),
  );
  const ids = catalog.venues.flatMap((v) => v.beers.map((b) => b.id));
  assert.equal(new Set(ids).size, 2550);
});
await test('review sessions cannot be forged; writes require same origin', () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    PRICE_SUGGESTIONS_ENABLED: 'true',
    DATABASE_URL: 'postgresql://test',
    DATABASE_REVIEW_URL: 'postgresql://test',
    PRICE_REVIEW_PASSWORD: 'p'.repeat(32),
    PRICE_SESSION_SECRET: 's'.repeat(64),
  });
  try {
    const token = sessionToken('review');
    const request = new Request('https://example.com/api/price-review/action', {
      headers: {
        cookie: `bm_price_review=${token}`,
        origin: 'https://example.com',
      },
    });
    requireReviewer(request);
    sameOrigin(request);
    assert.throws(() =>
      requireReviewer(
        new Request(request.url, {
          headers: { cookie: `bm_price_review=${token.slice(0, -2)}00` },
        }),
      ),
    );
    assert.throws(() =>
      requireReviewer(
        new Request(request.url, {
          headers: { cookie: `bm_price_review=${sessionToken('visitor')}` },
        }),
      ),
    );
    assert.throws(() =>
      sameOrigin(
        new Request(request.url, {
          headers: { origin: 'https://evil.example' },
        }),
      ),
    );
    assert(
      sessionCookie(request, 'bm_price_review', token, 3600).includes(
        '; Secure',
      ),
    );
    assert.throws(() =>
      sessionCookie(
        new Request('http://example.com'),
        'bm_price_review',
        token,
        3600,
      ),
    );
    assert(
      !sessionCookie(
        new Request('http://localhost:3010'),
        'bm_price_review',
        token,
        3600,
      ).includes('; Secure'),
    );
    assert(correctPassword('p'.repeat(32)));
    assert(!correctPassword('wrong'));
    process.env.PRICE_REVIEW_PASSWORD = 'admin';
    delete process.env.PRICE_LOCAL_ADMIN_LOGIN;
    assert(!pricesEnabled());
    process.env.PRICE_LOCAL_ADMIN_LOGIN = 'true';
    assert(pricesEnabled());
    assert(correctPassword('admin'));
    assert.throws(() => sessionCookie(request, 'bm_price_review', token, 3600));
    assert.throws(() => requireReviewer(request));
    const localRequest = new Request(
      'http://127.0.0.1:3010/api/price-review/action',
      {
        headers: {
          cookie: `bm_price_review=${token}`,
          origin: 'http://127.0.0.1:3010',
        },
      },
    );
    requireReviewer(localRequest);
    sameOrigin(localRequest);
    const visitorToken = sessionToken('visitor', 'visitor-id');
    assert.equal(
      visitor(
        new Request('http://localhost', {
          headers: { cookie: `bm_price_visitor=${visitorToken}` },
        }),
      ),
      'visitor-id',
    );
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
