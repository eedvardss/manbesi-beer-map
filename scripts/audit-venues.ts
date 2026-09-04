import { venueOpeningHours } from '../app/opening-hours';
import { mapVenues, venueBeerPrices } from '../app/venues';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('lv')
  .replace(/[^a-z0-9]+/g, '');

const pairKey = (first: string, second: string) => [first, second].sort().join('|');

const reviewedNearbyPairs = new Set([
  pairKey('nurme', '1983-bars'),
  pairKey('armoury', 'salons-mybeer'),
  pairKey('kwak-jauniela', 'cuba'),
  pairKey('bbars', 'gutenbergs-terrace'),
  pairKey('islande', 'islande-rooftop-terrace'),
  pairKey('skyline', 'voodoo-olybet-sports-bar'),
  pairKey('ezitis-aldaru', 'discovery-garaza'),
  pairKey('ezitis-grecinieku', 'sinners-bar'),
  pairKey('osm-node-569925824', 'riga-black-magic'),
  pairKey('long-island-bar', 'opaps'),
  pairKey('voodoo-olybet-sports-bar', 'radisson-latvija-lobby-bar'),
  pairKey('folkklubs-ala-pagrabs', 'piga-peldu'),
  pairKey('nb-club', 'barn-fries-riga'),
  pairKey('sloshed-bar-riga', 'tiki-bar-riga'),
  pairKey('kempinski-lobby-lounge', 'olybet-grand-hotel-kempinski'),
  pairKey('alibi-room', 'the-snuggest'),
]);

const distanceMetres = (first: { lat: number; lng: number }, second: { lat: number; lng: number }) => {
  const earthRadius = 6_371_000;
  const firstLatitude = first.lat * Math.PI / 180;
  const secondLatitude = second.lat * Math.PI / 180;
  const latitudeDelta = (second.lat - first.lat) * Math.PI / 180;
  const longitudeDelta = (second.lng - first.lng) * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
};

const failures: string[] = [];
const groups = (key: (venue: (typeof mapVenues)[number]) => string) =>
  [...Map.groupBy(mapVenues, key).entries()].filter(([, venues]) => venues.length > 1);

for (const [id, venues] of groups((venue) => venue.id)) {
  failures.push(`Duplicate id ${id}: ${venues.map((venue) => venue.name).join(', ')}`);
}

for (const [name, venues] of groups((venue) => normalize(venue.name))) {
  failures.push(`Duplicate normalized name ${name}: ${venues.map((venue) => `${venue.name} (${venue.address})`).join(', ')}`);
}

for (const venue of mapVenues) {
  const beers = venueBeerPrices(venue);
  if (!venue.name.trim()) failures.push(`Empty name: ${venue.id}`);
  if (!venue.address.trim() || /adrese nav norādīta/i.test(venue.address)) failures.push(`Missing exact address: ${venue.id}`);
  if (!Number.isFinite(venue.lat) || !Number.isFinite(venue.lng)
    || venue.lat < 56.80 || venue.lat > 57.20 || venue.lng < 23.80 || venue.lng > 24.40) {
    failures.push(`Coordinates outside Riga bounds: ${venue.id} (${venue.lat}, ${venue.lng})`);
  }
  if (!/^https?:\/\//.test(venue.sourceUrl)) failures.push(`Invalid source URL: ${venue.id}`);
  if (!beers.length) failures.push(`Empty beer list: ${venue.id}`);
  if (!venueOpeningHours[venue.id]) failures.push(`Missing weekly hours record: ${venue.id}`);

  const beerKeys = new Set<string>();
  for (const beer of beers) {
    if (!beer.name.trim()) failures.push(`Empty beer name: ${venue.id}`);
    if (!Number.isFinite(beer.price) || beer.price <= 0) failures.push(`Invalid price: ${venue.id} / ${beer.name}`);
    if (beer.volumeMl !== null && (!Number.isFinite(beer.volumeMl) || beer.volumeMl <= 0)) {
      failures.push(`Invalid volume: ${venue.id} / ${beer.name}`);
    }
    const beerKey = `${normalize(beer.name)}|${beer.volumeMl}|${beer.price}`;
    if (beerKeys.has(beerKey)) failures.push(`Duplicate beer row: ${venue.id} / ${beer.name} / ${beer.volumeMl} / ${beer.price}`);
    beerKeys.add(beerKey);
  }

  const cheapest = beers.reduce((best, beer) => beer.price < best.price ? beer : best);
  if (venue.price !== cheapest.price || venue.beer !== cheapest.name || venue.volumeMl !== cheapest.volumeMl) {
    failures.push(`Marker does not use cheapest serving: ${venue.id}`);
  }
}

const nearbyPairs: Array<{ distanceMetres: number; first: string; second: string }> = [];
for (let firstIndex = 0; firstIndex < mapVenues.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < mapVenues.length; secondIndex += 1) {
    const first = mapVenues[firstIndex];
    const second = mapVenues[secondIndex];
    const distance = distanceMetres(first, second);
    if (distance > 20) continue;
    nearbyPairs.push({ distanceMetres: Math.round(distance * 10) / 10, first: first.id, second: second.id });
    if (!reviewedNearbyPairs.has(pairKey(first.id, second.id))) {
      failures.push(`Unreviewed nearby pair (${distance.toFixed(1)} m): ${first.id} / ${second.id}`);
    }
  }
}

const result = {
  venues: mapVenues.length,
  uniqueIds: new Set(mapVenues.map((venue) => venue.id)).size,
  beerRows: mapVenues.reduce((total, venue) => total + venueBeerPrices(venue).length, 0),
  explicitUnknownOrPartialHours: mapVenues.filter((venue) => {
    const hours = venueOpeningHours[venue.id];
    return hours && [hours.mon, hours.tue, hours.wed, hours.thu, hours.fri, hours.sat, hours.sun]
      .some((day) => day === null);
  }).map((venue) => venue.name),
  reviewedNearbyPairs: nearbyPairs,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
