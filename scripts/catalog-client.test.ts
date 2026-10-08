import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../app/catalog';
import { fetchCatalog, prepareCatalog } from '../app/catalog-client';
import { isScheduleOpenAt } from '../app/opening-time';
import { isVenueOpenAt } from '../app/opening-hours';
import { venueBeerPrices } from '../app/venue-model';

await test('API projection preserves all serving data and opening-hour behavior', () => {
  const prepared = prepareCatalog(JSON.parse(JSON.stringify(catalog)));
  assert.equal(prepared.venues.length, catalog.venues.length);
  assert.equal(prepared.checkedAt, '04.09.2026');
  for (const [index, venue] of prepared.venues.entries()) {
    assert.deepEqual(venueBeerPrices(venue), JSON.parse(JSON.stringify(catalog.venues[index].beers)));
    assert.equal(venue.sourceUrl, catalog.venues[index].sourceUrl);
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (let minutes = 0; minutes < 1440; minutes += 30) {
        const clock = { dayIndex, minutes };
        assert.equal(isScheduleOpenAt(prepared.hours.get(venue.id), clock), isVenueOpenAt(venue.id, clock));
      }
    }
  }
  const [ala] = prepared.query('ALA Pagrabs', 'all', 'litre');
  assert.equal(ala.price, 18.9);
  assert.equal(ala.volumeMl, 3000);
});

await test('invalid API data is rejected before replacing a usable catalog', () => {
  for (const mutate of [
    (value: typeof catalog) => { value.schemaVersion = 99; },
    (value: typeof catalog) => { value.venues[0].beers[0].price = -1; },
    (value: typeof catalog) => { value.venues[0].lat = 100; },
    (value: typeof catalog) => { value.venues.push(value.venues[0]); },
    (value: typeof catalog) => { value.venues[0].sourceUrl = 'javascript:alert(1)'; },
    (value: typeof catalog) => { value.venues[0].openingHours!.week[0] = ['24:01-25:00']; },
  ]) {
    const value = structuredClone(catalog);
    mutate(value);
    assert.throws(() => prepareCatalog(value));
  }
});

await test('304 refresh reuses catalog and prepared indexes, while 503 and malformed responses fail', async () => {
  const previous = { catalog: prepareCatalog(catalog), etag: 'W/"unchanged"' };
  const signal = new AbortController().signal;
  const unchanged: typeof fetch = async (_url, options) => {
    assert.deepEqual(options?.headers, { 'If-None-Match': previous.etag });
    assert.equal(options?.cache, 'no-store');
    return new Response(null, { status: 304 });
  };
  assert.equal(await fetchCatalog(previous, signal, unchanged), previous);
  await assert.rejects(fetchCatalog(previous, signal, async () => new Response(null, { status: 503 })));
  await assert.rejects(fetchCatalog(previous, signal, async () => Response.json({ schemaVersion: 1 })));
});
