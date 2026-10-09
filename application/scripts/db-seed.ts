import { catalog, catalogJson } from '../app/catalog';
import { database, closeDatabase } from '../lib/database';

import { servingId } from '../lib/serving-id';

try {
  const ifEmpty = process.argv.includes('--if-empty');
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78124601)');
    const result = await client.query(
      `INSERT INTO beer_map_catalog (id, payload) VALUES ('published', $1)
     ON CONFLICT (id) ${ifEmpty ? 'DO NOTHING' : 'DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()'}`,
      [catalogJson],
    );
    const { rows } = await client.query<{ payload: string }>(
      "SELECT payload FROM beer_map_catalog WHERE id='published'",
    );
    const published = JSON.parse(rows[0].payload) as typeof catalog;
    const ids = new Set<string>();
    for (const venue of published.venues) {
      for (const beer of venue.beers) {
        const id = servingId(venue.id, beer);
        if (ids.has(id))
          throw new Error(`Ambiguous serving identity in ${venue.id}`);
        ids.add(id);
        await client.query(
          `INSERT INTO beer_map_servings(id,venue_id,venue_name,beer_name,volume_ml,package_count,price_is_from,baseline_cents)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET active=true,venue_name=excluded.venue_name,
        version=beer_map_servings.version+CASE WHEN beer_map_servings.baseline_cents<>excluded.baseline_cents THEN 1 ELSE 0 END,
        baseline_cents=excluded.baseline_cents`,
          [
            id,
            venue.id,
            venue.name,
            beer.name,
            beer.volumeMl,
            beer.packageCount ?? 1,
            beer.priceIsFrom ?? false,
            Math.round(beer.price * 100),
          ],
        );
      }
    }
    await client.query(
      'UPDATE beer_map_servings SET active=false WHERE NOT (id=ANY($1::uuid[]))',
      [Array.from(ids)],
    );
    await client.query('COMMIT');
    console.log(
      result.rowCount
        ? `Seeded ${catalog.venues.length} sourced venues`
        : 'Existing catalog preserved',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await closeDatabase();
}
