import { compareServings, createVenueQuery } from './beer-query';
import type { BeerPrice, Venue } from './venue-model';
import type { PreparedWeek } from './opening-time';

export type PreparedCatalog = {
  venues: Venue[];
  hours: Map<string, PreparedWeek>;
  checkedAt: string;
  query: ReturnType<typeof createVenueQuery>;
};
export type CatalogSnapshot = { catalog: PreparedCatalog; etag: string | null };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid catalog object');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid catalog text');
  return value;
}
function number(value: unknown, minimum: number, maximum = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error('Invalid catalog number');
  return value;
}
function sourceUrl(value: unknown): string {
  const url = text(value);
  if (!/^https?:\/\//.test(url)) throw new Error('Invalid source URL');
  return url;
}
function beer(value: unknown): BeerPrice {
  const item = record(value);
  if (item.priceIsFrom !== undefined && typeof item.priceIsFrom !== 'boolean') throw new Error('Invalid from price');
  const packageCount = item.packageCount === undefined ? undefined : number(item.packageCount, 1);
  if (packageCount !== undefined && !Number.isInteger(packageCount)) throw new Error('Invalid multipack');
  return {
    ...item,
    name: text(item.name), price: number(item.price, 0),
    volumeMl: item.volumeMl === null ? null : number(item.volumeMl, 1),
    ...(packageCount === undefined ? {} : { packageCount }),
    ...(item.priceIsFrom === undefined ? {} : { priceIsFrom: item.priceIsFrom as boolean }),
  };
}

export function prepareCatalog(value: unknown): PreparedCatalog {
  const data = record(value);
  if (data.schemaVersion !== 1 || data.currency !== 'EUR' || !Array.isArray(data.venues)) throw new Error('Unsupported catalog');
  const date = text(data.checkedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error('Invalid research date');
  const ids = new Set<string>();
  const hours = new Map<string, PreparedWeek>();
  const venues = data.venues.map((value): Venue => {
    const item = record(value);
    const id = text(item.id);
    if (ids.has(id)) throw new Error('Duplicate venue');
    ids.add(id);
    if (!Array.isArray(item.beers) || !item.beers.length) throw new Error('Missing servings');
    const beers = item.beers.map(beer);
    const best = beers.reduce((best, next) => compareServings(next, best, 'price') < 0 ? next : best);
    if (item.sourceType !== 'Oficiālā ēdienkarte' && item.sourceType !== 'Verificēta aktuālā alus karte') throw new Error('Invalid source type');
    if (item.openingHours !== null) {
      const opening = record(item.openingHours);
      sourceUrl(opening.sourceUrl);
      text(opening.checkedAt);
      if (!Array.isArray(opening.week) || opening.week.length !== 7) throw new Error('Invalid opening week');
      hours.set(id, opening.week.map((day) => {
        if (day === null) return null;
        if (!Array.isArray(day)) throw new Error('Invalid opening day');
        return day.map((interval): [number, number] => {
          if (typeof interval !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]|24):[0-5]\d$/.test(interval) || /24:(?!00)/.test(interval)) throw new Error('Invalid opening interval');
          const [start, end] = interval.split('-').map((part) => {
            const [hour, minute] = part.split(':').map(Number);
            return hour * 60 + minute;
          });
          return [start, end];
        });
      }));
    }
    return {
      id, name: text(item.name), kind: text(item.kind), address: text(item.address),
      lat: number(item.lat, -90, 90), lng: number(item.lng, -180, 180),
      sourceUrl: sourceUrl(item.sourceUrl), sourceLabel: text(item.sourceLabel), sourceType: item.sourceType,
      beer: best.name, price: best.price, volumeMl: best.volumeMl,
      priceIsFrom: best.priceIsFrom, packageCount: best.packageCount, beerPrices: beers,
    };
  });
  return { venues, hours, checkedAt: date.split('-').reverse().join('.'), query: createVenueQuery(venues) };
}

export async function fetchCatalog(previous: CatalogSnapshot | null, signal: AbortSignal, request: typeof fetch = fetch): Promise<CatalogSnapshot> {
  const response = await request('/api/venues', {
    signal, cache: 'no-store', headers: previous?.etag ? { 'If-None-Match': previous.etag } : {},
  });
  if (response.status === 304 && previous) return previous;
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return { catalog: prepareCatalog(await response.json()), etag: response.headers.get('ETag') };
}
