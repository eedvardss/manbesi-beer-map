import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { catalog } from '../app/catalog';
import { database, closeDatabase } from '../lib/database';
import { readCatalogJson } from '../lib/catalog-store';

// This suite deliberately writes and removes data only in a named disposable DB.
const connection = process.env.BEER_MAP_TEST_DATABASE_URL;
if (!connection || !new URL(connection).pathname.endsWith('_prices_test'))
  throw new Error('Use a dedicated database ending in _prices_test');
process.env.DATABASE_URL = connection;
function run(script: string, ...args: string[]) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', script, ...args],
    { env: process.env, encoding: 'utf8', timeout: 60000 },
  );
  assert.equal(result.status, 0, result.stderr);
}
const reporter = 'a'.repeat(64);
const actor = 'test-reviewer';
const source = 'https://example.com/verified-menu';
const selected = catalog.venues
  .find((v) => v.id === 'folkklubs-ala-pagrabs')!
  .beers.find((b) => b.volumeMl === 3000)!;
const submit = async (
  price: number,
  revision = 0,
  key = randomUUID(),
  identity = reporter,
) => {
  const { rows } = await database().query<{
    result: { id: string; duplicate: boolean };
  }>('SELECT beer_map_submit_price($1,$2,$3,$4,$5,$6,$7) result', [
    selected.id,
    price,
    revision,
    identity,
    key,
    'local test',
    source,
  ]);
  return rows[0].result;
};
const approve = (id: string) =>
  database().query(
    "SELECT beer_map_review_price($1,'approve',$2,current_date,$3)",
    [id, source, actor],
  );
try {
  await test('additive migration and repeated seed preserve submissions and serving identity', async () => {
    run('scripts/db-migrate.ts');
    run('scripts/db-migrate.ts');
    await database().query(
      'TRUNCATE beer_map_servings,beer_map_price_limits CASCADE',
    );
    run('scripts/db-seed.ts');
    const count = await database().query(
      'SELECT count(*)::int count FROM beer_map_servings WHERE active',
    );
    assert.equal(count.rows[0].count, 2550);
    const suggestion = await submit(1850);
    run('scripts/db-seed.ts', '--if-empty');
    assert.equal(
      (
        await database().query(
          'SELECT status FROM beer_map_price_suggestions WHERE id=$1',
          [suggestion.id],
        )
      ).rows[0].status,
      'pending',
    );
  });
  await test('idempotency, conflicts, approval and reversal are durable and invalidate only published data', async () => {
    const before = await readCatalogJson();
    const key = randomUUID();
    const one = await submit(1750, 0, key, 'b'.repeat(64));
    const duplicate = await submit(1750, 0, key, 'b'.repeat(64));
    assert.equal(duplicate.id, one.id);
    assert(duplicate.duplicate);
    await assert.rejects(submit(1760, 0, key, 'b'.repeat(64)), {
      code: 'P0409',
    });
    assert.equal(
      await readCatalogJson(),
      before,
      'Pending report must not change the public catalog',
    );
    const competitor = await submit(1650, 0, randomUUID(), 'c'.repeat(64));
    const results = await Promise.allSettled([
      approve(one.id),
      approve(competitor.id),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const failed = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    assert.equal(failed.reason.code, 'P0409');
    const published = await readCatalogJson();
    assert.notEqual(published, before);
    const after = JSON.parse(published) as typeof catalog;
    const beer = after.venues
      .find((v) => v.id === 'folkklubs-ala-pagrabs')!
      .beers.find((b) => b.id === selected.id)!;
    assert.equal(beer.revision, 1);
    assert([16.5, 17.5].includes(beer.price));
    run('scripts/db-seed.ts', '--if-empty');
    assert.equal(
      await readCatalogJson(),
      published,
      'Restart must retain the approved quote',
    );
    const history = await database().query(
      'SELECT * FROM beer_map_price_changes WHERE serving_id=$1',
      [selected.id],
    );
    assert.equal(history.rowCount, 1);
    await assert.rejects(submit(1700), { code: 'P0409' });
    await database().query('SELECT beer_map_revert_price($1,1,$2)', [
      selected.id,
      actor,
    ]);
    const reverted = JSON.parse(await readCatalogJson()) as typeof catalog;
    const original = reverted.venues
      .find((v) => v.id === 'folkklubs-ala-pagrabs')!
      .beers.find((b) => b.id === selected.id)!;
    assert.equal(original.price, selected.price);
    assert.equal(original.revision, 2);
    assert.equal(
      (
        await database().query(
          'SELECT count(*)::int count FROM beer_map_price_changes WHERE serving_id=$1',
          [selected.id],
        )
      ).rows[0].count,
      2,
    );
  });
  await test('rejection, SQL constraints and rollback do not publish a quote', async () => {
    const before = await readCatalogJson();
    const rejected = await submit(1800, 2, randomUUID(), 'd'.repeat(64));
    await database().query(
      "SELECT beer_map_review_price($1,'reject','',NULL,$2)",
      [rejected.id, actor],
    );
    assert.equal(await readCatalogJson(), before);
    const pending = await submit(1600, 2, randomUUID(), 'e'.repeat(64));
    await assert.rejects(
      database().query(
        "SELECT beer_map_review_price($1,'approve','javascript:alert(1)',current_date,$2)",
        [pending.id, actor],
      ),
      { code: 'P0400' },
    );
    assert.equal(
      (
        await database().query(
          'SELECT status FROM beer_map_price_suggestions WHERE id=$1',
          [pending.id],
        )
      ).rows[0].status,
      'pending',
    );
    const client = await database().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT beer_map_review_price($1,'approve',$2,current_date,$3)",
        [pending.id, source, actor],
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    assert.equal(await readCatalogJson(), before);
    await assert.rejects(submit(-10, 2, randomUUID(), 'f'.repeat(64)), {
      code: 'P0400',
    });
    await assert.rejects(
      database().query(
        'UPDATE beer_map_price_suggestions SET proposed_cents=0 WHERE id=$1',
        [pending.id],
      ),
      { code: '23514' },
    );
  });
  await test('quotas survive another connection and restricted roles cannot write catalog or bypass review', async () => {
    for (let i = 0; i < 10; i++)
      await submit(1000 + i, 2, randomUUID(), '9'.repeat(64));
    await assert.rejects(submit(1020, 2, randomUUID(), '9'.repeat(64)), {
      code: 'P0429',
    });
    run('scripts/db-price-roles.ts');
    const appUrl = new URL(connection);
    appUrl.username = 'beer_map_app';
    appUrl.password = process.env.APP_DATABASE_PASSWORD!;
    const app = new pg.Client({ connectionString: appUrl.href });
    await app.connect();
    try {
      await app.query('SELECT 1 FROM beer_map_catalog');
      await assert.rejects(
        app.query('UPDATE beer_map_catalog SET payload=payload'),
        { code: '42501' },
      );
      await assert.rejects(
        app.query('DELETE FROM beer_map_price_suggestions'),
        { code: '42501' },
      );
      await assert.rejects(
        app.query("SELECT beer_map_revert_price($1,2,'attacker')", [
          selected.id,
        ]),
        { code: '42501' },
      );
      await assert.rejects(
        app.query('SELECT beer_map_take_price_limit($1,9999)', [
          'submit:global',
        ]),
        { code: '42501' },
      );
      await assert.rejects(
        app.query('SELECT beer_map_submit_price($1,$2,$3,$4,$5,$6,$7)', [
          selected.id,
          1020,
          2,
          '9'.repeat(64),
          randomUUID(),
          'local test',
          source,
        ]),
        { code: 'P0429' },
      );
    } finally {
      await app.end();
    }
  });
  await test('successive reversals peel back accepted overrides without replaying a reverted change', async () => {
    const first = await submit(1200, 2, randomUUID(), 'ab'.repeat(32));
    await approve(first.id);
    const second = await submit(1100, 3, randomUUID(), 'cd'.repeat(32));
    await approve(second.id);
    await database().query('SELECT beer_map_revert_price($1,4,$2)', [
      selected.id,
      actor,
    ]);
    assert.equal(
      (
        await database().query(
          'SELECT price_cents,suggestion_id FROM beer_map_current_prices WHERE serving_id=$1',
          [selected.id],
        )
      ).rows[0].suggestion_id,
      first.id,
    );
    await database().query('SELECT beer_map_revert_price($1,5,$2)', [
      selected.id,
      actor,
    ]);
    assert.equal(
      (
        await database().query(
          'SELECT * FROM beer_map_current_prices WHERE serving_id=$1',
          [selected.id],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await database().query(
          'SELECT new_cents FROM beer_map_price_changes WHERE serving_id=$1 AND version=6',
          [selected.id],
        )
      ).rows[0].new_cents,
      Math.round(selected.price * 100),
    );
    await assert.rejects(
      database().query('SELECT beer_map_revert_price($1,6,$2)', [
        selected.id,
        actor,
      ]),
      { code: 'P0404' },
    );
  });
} finally {
  await closeDatabase();
}
