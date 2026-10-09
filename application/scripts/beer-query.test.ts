import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareServings, createVenueQuery, normalizeSearch, queryVenues, servingPerLitre, type PriceBand, type SortMode } from '../app/beer-query';
import {
  dedupeBeerPrices,
  assertNoConflictingPrices,
} from '../app/beer-identity';
import {
  mapVenues,
  pricePerLitre,
  venueBeerPrices,
  type Venue,
} from '../app/venues';
const ala = mapVenues.find((v) => v.id === 'folkklubs-ala-pagrabs')!;

await test('best litre includes all sizes and displays the winning jug', () => {
  const [result] = queryVenues([ala], '', 'all', 'litre');
  assert.equal(result.volumeMl, 3000);
  assert.equal(result.price, 18.9);
  assert.equal(pricePerLitre(result), 6.3);
  assert.equal(
    venueBeerPrices(result).filter((b) => b.volumeMl === 3000).length,
    23,
  );
});
await test('beer search and price band match the same serving', () => {
  const [result] = queryVenues([ala], 'IPA', 'fiveToSix');
  assert.equal(result.beer, 'Folkkluba ALA Hazy IPA');
  assert.equal(result.price, 5.5);
  assert.equal(result.volumeMl, 500);
  assert.equal(result.beerPrices?.length, 1);
  assert.equal(queryVenues([ala], 'IPA', 'over6')[0].volumeMl, 3000);
  assert.equal(queryVenues([ala], 'IPA', 'under5')[0].price, 4.2);
});
await test('venue name, address, diacritics, and empty results', () => {
  assert.equal(
    queryVenues([ala], 'Pagrabs')[0].beerPrices?.length,
    ala.beerPrices?.length,
  );
  assert.equal(queryVenues([ala], 'Peldu')[0].id, ala.id);
  assert(queryVenues([ala], 'Brengulu')[0].beer.includes('Brenguļu'));
  assert.deepEqual(queryVenues([ala], 'no-such-beer'), []);
});
await test('unknown volume is not infinity and known values sort first', () => {
  const unknown = {
    ...ala,
    id: 'unknown',
    name: 'Unknown',
    beerPrices: [{ name: 'Unknown', volumeMl: null, price: 1 }],
  } as Venue;
  const results = queryVenues([unknown, ala], '', 'all', 'litre');
  assert.equal(results.at(-1)?.id, 'unknown');
  assert.equal(pricePerLitre(results.at(-1)!), null);
  assert.equal(
    servingPerLitre({ name: 'Unknown', volumeMl: null, price: 1 }),
    null,
  );
});
await test('multipacks use full purchased volume and remain distinct', () => {
  const single = { name: 'Beer', volumeMl: 500, price: 6 };
  const pack = { ...single, packageCount: 3 };
  assert.equal(servingPerLitre(pack), 4);
  assert.equal(dedupeBeerPrices([single, pack]).length, 2);
  assert.throws(
    () => assertNoConflictingPrices([single, { ...single, price: 7 }]),
    /Conflicting prices/,
  );
  assert.equal(dedupeBeerPrices([single, { ...single }]).length, 1);
});
await test('draught and bottled Karmeliet remain available and clearly labelled', () => {
  for (const id of ['bon-vivant', 'duvels']) {
    const venue = mapVenues.find((v) => v.id === id)!;
    assert(venue, id);
    const beers = venueBeerPrices(venue).filter((b) =>
      b.name.includes('Karmeliet'),
    );
    assert(beers.some((b) => b.name.includes('izlejams') && b.price === 7));
    assert(beers.some((b) => b.name.includes('pudelē') && b.price === 6.5));
  }
});
await test('every venue litre ranking uses the minimum known unit price', () => {
  for (const venue of mapVenues) {
    const prices = venueBeerPrices(venue)
      .map(servingPerLitre)
      .filter((p): p is number => p !== null);
    const [result] = queryVenues([venue], '', 'all', 'litre');
    assert.equal(
      pricePerLitre(result),
      prices.length ? Math.min(...prices) : null,
      venue.name,
    );
  }
});

await test('indexed linear selection preserves the original full-menu search and stable ranking', () => {
  const indexed = createVenueQuery(mapVenues);
  const bands: PriceBand[] = ['all', 'under5', 'fiveToSix', 'over6'];
  const sorts: SortMode[] = ['price', 'litre', 'name'];
  for (const query of ['', 'a', 'al', 'ALA', 'IPA', 'Brengulu', 'Peldu', 'no-such-beer']) {
    for (const band of bands) for (const sort of sorts) {
      const q = normalizeSearch(query.trim());
      // Reference the former filter + stable full sort, including tied beers.
      const expected = mapVenues.flatMap((venue) => {
        const venueMatch = !q || normalizeSearch(`${venue.name} ${venue.address} ${venue.kind}`).includes(q);
        const beers = venueBeerPrices(venue).filter((beer) =>
          (venueMatch || normalizeSearch(beer.name).includes(q)) &&
          (band === 'all' || (band === 'under5' ? beer.price < 5 : band === 'fiveToSix' ? beer.price >= 5 && beer.price <= 6 : beer.price > 6)),
        );
        if (!beers.length) return [];
        const best = [...beers].sort((a, b) => compareServings(a, b, sort))[0];
        return [{ ...venue, beer: best.name, price: best.price, volumeMl: best.volumeMl, packageCount: best.packageCount, priceIsFrom: best.priceIsFrom, beerPrices: beers }];
      }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'lv') : compareServings(a, b, sort) || a.name.localeCompare(b.name, 'lv'));
      assert.deepEqual(indexed(query, band, sort), expected, `${query} / ${band} / ${sort}`);
    }
  }
});

await test('unchanged quotes and complete menus retain venue identity across search and sort', () => {
  const indexed = createVenueQuery(mapVenues);
  const original = new Map(indexed().map((venue) => [venue.id, venue]));
  for (const venue of indexed('', 'all', 'name')) assert.equal(venue, original.get(venue.id), venue.name);
  assert.equal(indexed('Pagrabs')[0], original.get(ala.id));
  assert.deepEqual(indexed('not-a-real-beer'), []);
  for (const venue of indexed()) assert.equal(venue, original.get(venue.id), venue.name);
});

await test('a changed filtered menu invalidates identity even when the winning quote stays equal', () => {
  const beers = [
    { name: 'Amber Lager', volumeMl: 500, price: 3 },
    { name: 'Dark Lager', volumeMl: 500, price: 4 },
    { name: 'Amber IPA', volumeMl: 500, price: 5 },
  ];
  const source = { ...ala, id: 'identity-fixture', name: 'Venue', address: 'Street', beerPrices: beers } as Venue;
  const indexed = createVenueQuery([source]);
  const [full] = indexed();
  const [amber] = indexed('Amber');
  assert.equal(amber.price, full.price);
  assert.notEqual(amber, full);
  assert.deepEqual(amber.beerPrices, [beers[0], beers[2]]);
  assert.equal(indexed('Amber')[0], amber);
  const [litre] = indexed('Amber', 'all', 'litre');
  assert.equal(litre, amber);
  const [restored] = indexed();
  assert.deepEqual(restored.beerPrices, beers);
  assert.notEqual(restored, amber);
  const [fiveToSix] = indexed('Amber', 'fiveToSix');
  assert.equal(fiveToSix.price, 5);
  assert.deepEqual(fiveToSix.beerPrices, [beers[2]]);
});
