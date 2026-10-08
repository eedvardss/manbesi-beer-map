import { catalog, catalogJson } from '../app/catalog';
import { database, closeDatabase } from '../lib/database';

try {
  const ifEmpty = process.argv.includes('--if-empty');
  const result = await database().query(
    `INSERT INTO beer_map_catalog (id, payload) VALUES ('published', $1)
     ON CONFLICT (id) ${ifEmpty ? 'DO NOTHING' : 'DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()'}`,
    [catalogJson],
  );
  console.log(result.rowCount ? `Seeded ${catalog.venues.length} sourced venues` : 'Existing catalog preserved');
} finally {
  await closeDatabase();
}
