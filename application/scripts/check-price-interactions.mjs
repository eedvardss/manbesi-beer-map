import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import pg from 'pg';
import { priceSuggestions } from '../../playwright/price-suggestions.mjs';

const base = process.env.BEER_MAP_TEST_URL ?? 'http://127.0.0.1:3010';
const url = new URL(base);
assert(
  ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
  'Write tests run on localhost only',
);
const connection = process.env.PRICE_E2E_DATABASE_URL;
assert(
  connection && new URL(connection).pathname.endsWith('_prices_e2e'),
  'Set a disposable database ending in _prices_e2e',
);
const db = new pg.Client({ connectionString: connection });
await db.connect();
const artifacts = 'output/playwright/prices';
await mkdir(artifacts, { recursive: true });
let browser;
const marker = randomUUID();
try {
  // This sentinel proves the web app uses this disposable database, before
  // issuing any browser writes. Refuse to operate on another local app.
  await db.query(
    "UPDATE beer_map_catalog SET payload=jsonb_set(payload::jsonb,'{testFixture}',to_jsonb($1::text))::text WHERE id='published'",
    [marker],
  );
  const check = await fetch(new URL('/api/venues', base));
  assert.equal(check.status, 200);
  assert.equal(
    (await check.json()).testFixture,
    marker,
    'App does not use the selected test database',
  );
  await db.query(
    'TRUNCATE beer_map_price_suggestions,beer_map_price_changes,beer_map_current_prices,beer_map_price_limits CASCADE',
  );
  await db.query('UPDATE beer_map_servings SET version=0');
  await db.query(
    "UPDATE beer_map_catalog SET revision=revision+1 WHERE id='published'",
  );
  browser = await chromium.launch({ headless: true });
  await priceSuggestions({
    browser,
    db,
    base: base.replace(/\/$/, ''),
    unauthenticatedStatus: process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY ? 401 : 503,
    expect,
    artifacts,
  });
} finally {
  await browser?.close();
  await db.query(
    "UPDATE beer_map_catalog SET payload=(payload::jsonb-'testFixture')::text WHERE id='published'",
  );
  await db.end();
}
