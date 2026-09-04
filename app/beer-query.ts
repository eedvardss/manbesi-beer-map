import { type BeerPrice, type Venue, venueBeerPrices } from './venues';

export type PriceBand = 'all' | 'under5' | 'fiveToSix' | 'over6';
export type SortMode = 'price' | 'litre' | 'name';
export const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase('lv')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '');
export const servingPerLitre = (beer: BeerPrice): number | null =>
  beer.volumeMl && beer.volumeMl > 0
    ? beer.price / ((beer.volumeMl * (beer.packageCount ?? 1)) / 1000)
    : null;
const matchesBand = (beer: BeerPrice, band: PriceBand) =>
  band === 'all' ||
  (band === 'under5'
    ? beer.price < 5
    : band === 'fiveToSix'
      ? beer.price >= 5 && beer.price <= 6
      : beer.price > 6);
export const compareServings = (a: BeerPrice, b: BeerPrice, sort: SortMode) => {
  if (sort === 'litre') {
    const first = servingPerLitre(a),
      second = servingPerLitre(b);
    if (first !== second)
      return first === null ? 1 : second === null ? -1 : first - second;
  }
  return (
    a.price - b.price ||
    (b.volumeMl ?? 0) * (b.packageCount ?? 1) -
      (a.volumeMl ?? 0) * (a.packageCount ?? 1)
  );
};

// Choose and display the very same serving used for filtering and ranking.
export function queryVenues(
  venues: Venue[],
  query = '',
  band: PriceBand = 'all',
  sort: SortMode = 'price',
): Venue[] {
  const q = normalizeSearch(query.trim());
  return venues
    .flatMap((venue) => {
      const venueMatches =
        !q ||
        normalizeSearch(
          [venue.name, venue.address, venue.kind].join(' '),
        ).includes(q);
      const beers = venueBeerPrices(venue).filter(
        (beer) =>
          (venueMatches || normalizeSearch(beer.name).includes(q)) &&
          matchesBand(beer, band),
      );
      if (!beers.length) return [];
      const best = [...beers].sort((a, b) => compareServings(a, b, sort))[0];
      return [
        {
          ...venue,
          beer: best.name,
          price: best.price,
          volumeMl: best.volumeMl,
          packageCount: best.packageCount,
          priceIsFrom: best.priceIsFrom,
          beerPrices: beers,
        },
      ];
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'lv')
        : compareServings(a, b, sort) || a.name.localeCompare(b.name, 'lv'),
    );
}
