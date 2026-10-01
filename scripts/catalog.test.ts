import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../app/catalog';
import { GET } from '../app/api/venues/route';
import { mapVenues, venueBeerPrices } from '../app/venues';
import { queryVenues } from '../app/beer-query';
import { markerAmount, markerTone } from '../app/price-presentation';

await test('native API preserves every published serving and source', async () => {
  const response = GET(new Request('https://manbesi.lv/api/venues'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(catalog)));
  assert.equal(catalog.venues.length, mapVenues.length);
  assert.equal(catalog.checkedAt, '2026-09-04');
  for (const venue of mapVenues) {
    const exported = catalog.venues.find((record) => record.id === venue.id)!;
    assert.deepEqual(exported.beers, venueBeerPrices(venue));
    assert.equal(exported.sourceUrl, venue.sourceUrl);
  }
  const etag = response.headers.get('ETag')!;
  const unchanged = GET(new Request('https://manbesi.lv/api/venues', { headers: { 'If-None-Match': etag } }));
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');
});

await test('litre markers show and color the winning unit price', () => {
  const [ala] = queryVenues(mapVenues, 'ALA Pagrabs', 'all', 'litre');
  const beer = { name: ala.beer, price: ala.price, volumeMl: ala.volumeMl, packageCount: ala.packageCount };
  assert.equal(markerAmount(beer, 'litre'), 6.3);
  assert.equal(markerTone(beer, 'litre'), 'cheap');
  assert.equal(markerAmount(beer, 'price'), 18.9);
  assert.equal(markerTone(beer, 'price'), 'high');
  assert.equal(markerAmount({ ...beer, volumeMl: null }, 'litre'), null);
  assert.equal(markerTone({ ...beer, volumeMl: null }, 'litre'), 'unpriced');
});
