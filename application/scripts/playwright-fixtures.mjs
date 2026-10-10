import { test as base, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import pg from 'pg';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const privateFile = new URL('../artifacts/playwright.env', import.meta.url);
const compose = ['compose', '--env-file', fileURLToPath(privateFile), '-p', 'beer-map-playwright',
  '-f', 'infrastructure/compose.yaml', '-f', 'infrastructure/compose.prices.yaml',
  '-f', 'playwright/compose.yaml'];
export { expect };
export const test = base.extend({
  stack: [async ({ playwright: _playwright }, provide) => {
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    let text;
    try { text = await readFile(privateFile, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      text = ['POSTGRES_PASSWORD', 'APP_DATABASE_PASSWORD', 'REVIEW_DATABASE_PASSWORD', 'PRICE_SESSION_SECRET']
        .map((key) => `${key}=${randomBytes(32).toString('hex')}`).join('\n') + '\n';
      await writeFile(privateFile, text, { mode: 0o600 });
    }
    const env = Object.fromEntries(text.trim().split(/\r?\n/).map((line) => line.split('=')));
    // Fixed project and loopback ports isolate all test writes from user previews.
    try {
      await run('docker', [...compose, 'up', '--build', '-d', '--wait', '--wait-timeout', '180'],
        { cwd: root, timeout: 300_000, maxBuffer: 8 * 1024 * 1024 });
      await provide({ base: 'http://127.0.0.1:3011', unauthenticatedStatus: process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY ? 401 : 503,
        connection: `postgresql://beer_map:${env.POSTGRES_PASSWORD}@127.0.0.1:55434/beer_map_prices_e2e` });
    } finally {
      // Keep the volume and matching private credentials for subsequent UI runs.
      await run('docker', [...compose, 'down'], { cwd: root, timeout: 60_000 });
    }
  }, { scope: 'worker', timeout: 360_000 }],
  catalog: async ({ stack }, provide) => {
    const db = new pg.Client({ connectionString: stack.connection });
    await db.connect();
    try {
      const marker = randomUUID();
      await db.query("UPDATE beer_map_catalog SET payload=jsonb_set(payload::jsonb,'{testFixture}',to_jsonb($1::text))::text WHERE id='published'", [marker]);
      const response = await fetch(`${stack.base}/api/venues`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).testFixture, marker, 'Test app must use the isolated database');
      await db.query('TRUNCATE beer_map_price_suggestions,beer_map_price_changes,beer_map_current_prices,beer_map_price_limits CASCADE');
      await db.query('UPDATE beer_map_servings SET version=0');
      await db.query("UPDATE beer_map_catalog SET revision=revision+1 WHERE id='published'");
      await provide({ ...stack, db });
    } finally {
      await db.query("UPDATE beer_map_catalog SET payload=(payload::jsonb-'testFixture')::text WHERE id='published'");
      await db.end();
    }
  },
});
