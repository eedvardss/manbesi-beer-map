import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { catalog, catalogJson } from '../app/catalog';
import { GET } from '../app/api/venues/route';
import { GET as health } from '../app/api/health/route';
import { database, closeDatabase } from '../lib/database';

// Use a dedicated empty test database. This suite changes its catalog row.
if (!process.env.BEER_MAP_TEST_DATABASE_URL) throw new Error('Set BEER_MAP_TEST_DATABASE_URL to a dedicated test database');
process.env.DATABASE_URL = process.env.BEER_MAP_TEST_DATABASE_URL;

function run(script: string, ...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    env: process.env, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

try {
  await test('migrations and seed are repeatable; API preserves every catalog byte', async () => {
    run('scripts/db-migrate.ts');
    run('scripts/db-migrate.ts');
    run('scripts/db-seed.ts');
    const response = await GET(new Request('http://localhost/api/venues'));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), catalogJson);
    assert.equal((await health()).status, 200);
    const etag = response.headers.get('ETag')!;
    const unchanged = await GET(new Request('http://localhost/api/venues', {
      headers: { 'If-None-Match': `"older", W/${etag}` },
    }));
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), '');

    const changedJson = JSON.stringify({ ...catalog, city: 'PostgreSQL test' });
    await database().query("UPDATE beer_map_catalog SET payload = $1 WHERE id = 'published'", [changedJson]);
    run('scripts/db-seed.ts', '--if-empty');
    const changed = await GET(new Request('http://localhost/api/venues', { headers: { 'If-None-Match': etag } }));
    assert.equal(changed.status, 200);
    assert.equal(await changed.text(), changedJson);
    assert.notEqual(changed.headers.get('ETag'), etag);
    run('scripts/db-seed.ts');
    assert.equal(await (await GET(new Request('http://localhost/api/venues'))).text(), catalogJson);
    await assert.rejects(database().query("UPDATE beer_map_catalog SET payload = '{}' WHERE id = 'published'"));
  });

  await test('missing catalog and unreachable database return uncached 503s', async () => {
    await database().query("DELETE FROM beer_map_catalog WHERE id = 'published'");
    const missing = await GET(new Request('http://localhost/api/venues'));
    assert.equal(missing.status, 503);
    assert.equal(missing.headers.get('Cache-Control'), 'no-store');
    assert.equal((await health()).status, 503);
    run('scripts/db-seed.ts');
    await closeDatabase();
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
    assert.equal((await GET(new Request('http://localhost/api/venues'))).status, 503);
    assert.equal((await health()).status, 503);
  });
} finally {
  await closeDatabase();
}
