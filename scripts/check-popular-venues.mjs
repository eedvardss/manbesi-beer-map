import assert from 'node:assert/strict';
import { build } from 'esbuild';

const [{ text: bundledSource }] = (await build({
  entryPoints: ['app/popular-venues.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})).outputFiles;
const { popularVenueData } = await import(`data:text/javascript;base64,${Buffer.from(bundledSource).toString('base64')}`);

assert.equal(popularVenueData.venues.length, 12, 'Expected four PĪGA branches and eight newly verified bars');
assert.equal(popularVenueData.venues.filter((venue) => venue.id.startsWith('piga-')).length, 4);

const expectedBeerCounts = new Map([
  ['piga-peldu', 16],
  ['piga-briana', 16],
  ['piga-avotu', 16],
  ['piga-ilguciems', 16],
  ['cartel-bar', 11],
  ['8-lounge', 8],
  ['aussie-backpackers-pub', 26],
  ['pepsi-centrs-meste', 10],
  ['nb-club', 14],
  ['joker-deglava-100', 1],
  ['joker-kastranes-3a', 1],
  ['joker-tilta-8', 1],
]);

for (const venue of popularVenueData.venues) {
  assert.equal(venue.beerPrices.length, expectedBeerCounts.get(venue.id), `Unexpected beer count for ${venue.name}`);
  assert(venue.beerPrices.every((beer) => beer.price > 0), `Invalid price for ${venue.name}`);
  assert(venue.beerPrices.every((beer) => beer.volumeMl === null || beer.volumeMl > 0), `Invalid volume for ${venue.name}`);
  assert(venue.sourceUrl.startsWith('https://'), `Invalid source for ${venue.name}`);
  assert(venue.hours.sourceUrl.startsWith('https://'), `Invalid hours source for ${venue.name}`);
}

console.log('Validated 12 popular-bar additions and 136 beer price rows.');
