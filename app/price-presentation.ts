import { servingPerLitre, type SortMode } from './beer-query';
import type { BeerPrice } from './venues';

export const markerAmount = (beer: BeerPrice, sort: SortMode) =>
  sort === 'litre' ? servingPerLitre(beer) : beer.price;

export function markerTone(beer: BeerPrice, sort: SortMode) {
  const amount = markerAmount(beer, sort);
  if (amount === null) return 'unpriced';
  // Keep the same color scale: one serving, or a half-litre equivalent.
  const comparable = sort === 'litre' ? amount / 2 : amount;
  if (comparable < 4) return 'cheap';
  if (comparable <= 5) return 'mid';
  if (comparable <= 6) return 'warm';
  return 'high';
}
