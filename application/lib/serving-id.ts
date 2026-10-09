import { createHash } from 'node:crypto';

// Price and array position are deliberately excluded. Identity changes (such
// as another serving size) create a new serving; old reports stay linked.
export function servingId(
  venueId: string,
  beer: {
    name: string;
    volumeMl: number | null;
    packageCount?: number;
    priceIsFrom?: boolean;
  },
) {
  const hex = createHash('sha256')
    .update(
      JSON.stringify([
        'beer-map-serving-v1',
        venueId,
        beer.name,
        beer.volumeMl,
        beer.packageCount ?? 1,
        beer.priceIsFrom ?? false,
      ]),
    )
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
