import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabaseConfiguration } from './runtime-config.mjs';

await test('strict deployment rejects an absent database; intentional file mode remains available', () => {
  assert.throws(() => loadDatabaseConfiguration({ BEER_MAP_REQUIRE_DATABASE: 'true' }), /required/);
  assert.doesNotThrow(() => loadDatabaseConfiguration({}));
});

await test('database credentials are correctly URL encoded without disclosure', () => {
  const env = { DATABASE_HOST: 'db', DATABASE_USER: 'app', DATABASE_NAME: 'beer_map', DATABASE_PASSWORD: 'p@ss:/?#', BEER_MAP_REQUIRE_DATABASE: 'true' };
  loadDatabaseConfiguration(env);
  const parsed = new URL(env.DATABASE_URL);
  assert.equal(parsed.hostname, 'db');
  assert.equal(decodeURIComponent(parsed.password), env.DATABASE_PASSWORD);
  assert.equal(parsed.pathname, '/beer_map');
  assert.throws(() => loadDatabaseConfiguration({ DATABASE_URL: 'postgresql://db', DATABASE_URL_FILE: 'unused' }), /one/);
});
