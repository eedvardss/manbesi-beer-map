import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.BEER_MAP_TEST_URL ?? 'http://127.0.0.1:3000';
const health = await fetch(`${base}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).catalog, 'postgres');

const expected = JSON.parse(await readFile(new URL('../ios/BeerMap/Resources/venues.json', import.meta.url), 'utf8'));
const response = await fetch(`${base}/api/venues`);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), expected);
const etag = response.headers.get('ETag');
assert(etag, 'Catalog must provide an ETag');
const unchanged = await fetch(`${base}/api/venues`, { headers: { 'If-None-Match': `W/${etag}` } });
assert.equal(unchanged.status, 304);
assert.equal(await unchanged.text(), '');

const page = await fetch(base);
assert.equal(page.status, 200);
const html = await page.text();
const asset = html.match(/src="([^" ]+\.js)"/);
assert(asset, 'Page must include its JavaScript assets');
const javascript = await fetch(new URL(asset[1], base), { headers: { 'Accept-Encoding': 'br' } });
assert.equal(javascript.status, 200);
assert.equal(javascript.headers.get('Content-Encoding'), 'br', 'Serve a precompressed JavaScript variant');
console.log(`Container checks pass: page, JS asset, PostgreSQL health, ${expected.venues.length} venues, ${expected.venues.reduce((count, venue) => count + venue.beers.length, 0)} servings, and conditional 304.`);
