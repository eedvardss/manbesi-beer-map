import { catalogJson } from '../app/catalog';
import { assertDatabaseConfiguration, database, databaseConfigured } from './database';

// Keep the complete versioned API document, including serving identity and
// provenance. TEXT preserves the same bytes and ETag as the file catalog.
export async function readCatalogJson(): Promise<string> {
  assertDatabaseConfiguration();
  if (!databaseConfigured()) return catalogJson;
  const previous = cached;
  const result = await database().query<{ payload: string | null; version: string }>(
    `SELECT updated_at::text AS version,
     CASE WHEN updated_at::text = $1 THEN NULL ELSE payload END AS payload
     FROM beer_map_catalog WHERE id = 'published'`, [previous?.version ?? null],
  );
  if (!result.rows[0]) throw new Error('Published catalog has not been seeded');
  const row = result.rows[0];
  if (row.payload === null && previous) return previous.payload;
  if (row.payload === null) throw new Error('Catalog payload missing');
  cached = { version: row.version, payload: row.payload };
  return row.payload;
}

// Retain one immutable snapshot; unchanged requests still check the database,
// but avoid transferring the complete document across its connection.
let cached: { version: string; payload: string } | undefined;

export async function catalogReady() {
  assertDatabaseConfiguration();
  if ((globalThis as typeof globalThis & { __beerMapDraining?: boolean }).__beerMapDraining) return false;
  if (!databaseConfigured()) return true;
  const result = await database().query("SELECT 1 FROM beer_map_catalog WHERE id = 'published'");
  return result.rowCount === 1;
}
