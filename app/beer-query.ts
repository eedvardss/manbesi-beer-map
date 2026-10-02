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

const nameCollator = new Intl.Collator('lv');
const compareNames = (a: string, b: string) => nameCollator.compare(a, b);
type SearchEntry = {
  venue: Venue;
  beers: BeerPrice[];
  venueText?: string;
  beerTexts?: string[];
};

// The website's catalog is immutable for a page lifetime. Normalize it once,
// keeping the filtered full menu and winning serving exactly as before.
export function createVenueQuery(venues: Venue[]) {
  const entries = venues.map((venue): SearchEntry => {
    const beers = venueBeerPrices(venue);
    return {
      venue, beers,
      venueText: normalizeSearch([venue.name, venue.address, venue.kind].join(' ')),
      beerTexts: beers.map((beer) => normalizeSearch(beer.name)),
    };
  });
  return (query = '', band: PriceBand = 'all', sort: SortMode = 'price') =>
    queryEntries(entries, query, band, sort);
}

// Choose and display the very same serving used for filtering and ranking.
export function queryVenues(
  venues: Venue[],
  query = '',
  band: PriceBand = 'all',
  sort: SortMode = 'price',
): Venue[] {
  return queryEntries(venues.map((venue) => ({ venue, beers: venueBeerPrices(venue) })), query, band, sort);
}

function queryEntries(entries: SearchEntry[], query: string, band: PriceBand, sort: SortMode): Venue[] {
  const q = normalizeSearch(query.trim());
  return entries
    .flatMap(({ venue, beers: menu, venueText, beerTexts }) => {
      const venueMatches =
        !q ||
        (venueText ?? normalizeSearch(
          [venue.name, venue.address, venue.kind].join(' '),
        )).includes(q);
      const beers = venueMatches && band === 'all' ? menu : menu.filter(
        (beer, index) => matchesBand(beer, band) &&
          (venueMatches || (beerTexts?.[index] ?? normalizeSearch(beer.name)).includes(q)),
      );
      if (!beers.length) return [];
      let best = beers[0];
      for (let i = 1; i < beers.length; i++) {
        if (compareServings(beers[i], best, sort) < 0) best = beers[i];
      }
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
        ? compareNames(a.name, b.name)
        : compareServings(a, b, sort) || compareNames(a.name, b.name),
    );
}
