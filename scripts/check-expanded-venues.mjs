import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../app/data/verified-venues-expansion.json', import.meta.url)));
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const normalize = (value) => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

assert(Array.isArray(data.venues) && data.venues.length > 0, 'Expansion must contain venues');

const ids = new Set();
const names = new Set();
let beerPriceRows = 0;

for (const venue of data.venues) {
  assert(!ids.has(venue.id), `Duplicate venue id: ${venue.id}`);
  ids.add(venue.id);

  const normalizedName = normalize(venue.name);
  assert(!names.has(normalizedName), `Duplicate venue name: ${venue.name}`);
  names.add(normalizedName);

  assert(venue.lat >= 56.8 && venue.lat <= 57.2, `Latitude outside Riga: ${venue.name}`);
  assert(venue.lng >= 23.8 && venue.lng <= 24.5, `Longitude outside Riga: ${venue.name}`);
  assert(venue.sourceUrl.startsWith('https://'), `Invalid source URL: ${venue.name}`);
  assert(!/(wolt|bolt|foodora)/i.test(venue.sourceUrl), `Delivery source is forbidden: ${venue.name}`);
  assert(Array.isArray(venue.beerPrices) && venue.beerPrices.length > 0, `No beer prices: ${venue.name}`);

  for (const beer of venue.beerPrices) {
    assert(typeof beer.name === 'string' && beer.name.trim(), `Missing beer name: ${venue.name}`);
    assert(Number.isFinite(beer.price) && beer.price > 0, `Invalid beer price: ${venue.name}`);
    assert(beer.volumeMl === null || (Number.isFinite(beer.volumeMl) && beer.volumeMl > 0), `Invalid beer volume: ${venue.name}`);
    beerPriceRows += 1;
  }

  if (!venue.hours) continue;
  assert(venue.hours.sourceUrl.startsWith('https://'), `Invalid hours source: ${venue.name}`);
  for (const day of dayKeys) {
    const intervals = venue.hours[day];
    assert(intervals === null || Array.isArray(intervals), `Invalid ${day} hours: ${venue.name}`);
    for (const interval of intervals ?? []) {
      assert(/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(interval), `Invalid interval ${interval}: ${venue.name}`);
    }
  }
}

const olyBetVenues = data.venues.filter((venue) => /olybet/i.test(venue.name));
assert.deepEqual(olyBetVenues.map((venue) => venue.id), ['voodoo-olybet-sports-bar'], 'Only Voodoo may use the OlyBet menu');

console.log(`Validated ${data.venues.length} expansion venues and ${beerPriceRows} beer price rows.`);
