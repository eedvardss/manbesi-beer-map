import type { BeerPrice } from './venues';
export const beerIdentity = (beer: BeerPrice) =>
  [
    beer.name
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toLocaleLowerCase('lv')
      .replace(/[^\p{L}\p{N}]+/gu, ''),
    beer.volumeMl,
    beer.packageCount ?? 1,
    beer.priceIsFrom ?? false,
  ].join('|');
export function assertNoConflictingPrices(prices: BeerPrice[]): void {
  const rows = new Map<string, BeerPrice>();
  for (const beer of prices) {
    const key = beerIdentity(beer);
    const previous = rows.get(key);
    if (previous && previous.price !== beer.price)
      throw new Error(
        `Conflicting prices for ${beer.name} / ${beer.volumeMl} ml: ${previous.price} and ${beer.price}. Verify source and serving type.`,
      );
    rows.set(key, beer);
  }
}

// Preserve unresolved conflicts for the publication audit; never silently pick a price.
export const dedupeBeerPrices = (prices: BeerPrice[]): BeerPrice[] => [
  ...new Map(
    prices.map((beer) => [`${beerIdentity(beer)}|${beer.price}`, beer]),
  ).values(),
];
