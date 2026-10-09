import { catalogJson } from '../app/catalog';
import { database, databaseConfigured } from './database';
import { servingId } from './serving-id';
import type { BeerPrice } from '../app/venue-model';

// Keep the complete versioned API document, including serving identity and
// provenance. TEXT preserves the same bytes and ETag as the file catalog.
export async function readCatalogJson(): Promise<string> {
  if (!databaseConfigured()) return catalogJson;
  const previous = cached;
  const result = await database().query<{
    payload: string | null;
    version: string;
    updates:
      | {
          id: string;
          revision: number;
          priceCents: number | null;
          observedOn: string;
          publishedAt: string;
          sourceUrl: string;
        }[]
      | null;
  }>(
    `SELECT updated_at::text || ':' || revision AS version,
     CASE WHEN updated_at::text || ':' || revision = $1 THEN NULL ELSE payload END AS payload,
     CASE WHEN updated_at::text || ':' || revision = $1 THEN NULL ELSE
       (SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'revision',s.version,'priceCents',p.price_cents,
         'observedOn',p.observed_on,'publishedAt',p.published_at,'sourceUrl',p.evidence_url)),'[]'::jsonb)
        FROM beer_map_servings s LEFT JOIN beer_map_current_prices p ON p.serving_id=s.id
        WHERE s.active AND (s.version>0 OR p.serving_id IS NOT NULL)) END AS updates
     FROM beer_map_catalog WHERE id = 'published'`,
    [previous?.version ?? null],
  );
  if (!result.rows[0]) throw new Error('Published catalog has not been seeded');
  const row = result.rows[0];
  if (row.payload === null && previous) return previous.payload;
  if (row.payload === null) throw new Error('Catalog payload missing');
  const data = JSON.parse(row.payload) as {
    venues: { id: string; beers: BeerPrice[] }[];
  };
  const updates = new Map(
    (row.updates ?? []).map((value) => [value.id, value]),
  );
  let changed = false;
  for (const venue of data.venues)
    for (const beer of venue.beers) {
      if (!beer.id) {
        beer.id = servingId(venue.id, beer);
        beer.revision = 0;
        changed = true;
      }
      const update = updates.get(beer.id);
      if (!update) continue;
      changed = true;
      beer.revision = update.revision;
      if (update.priceCents !== null) {
        beer.price = update.priceCents / 100;
        beer.priceUpdate = {
          observedOn: update.observedOn,
          publishedAt: update.publishedAt,
          sourceUrl: update.sourceUrl,
        };
      }
    }
  const payload = changed ? JSON.stringify(data) : row.payload;
  cached = { version: row.version, payload };
  return payload;
}

// Retain one immutable snapshot; unchanged requests still check the database,
// but avoid transferring the complete document across its connection.
let cached: { version: string; payload: string } | undefined;

export async function catalogReady() {
  if (!databaseConfigured()) return true;
  const result = await database().query(
    "SELECT 1 FROM beer_map_catalog WHERE id = 'published'",
  );
  return result.rowCount === 1;
}
