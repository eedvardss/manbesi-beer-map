import { readFile, readdir } from 'node:fs/promises';
import { database, closeDatabase } from '../lib/database';

try {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    // Serialize migration runners (for example, two application instances).
    await client.query('SELECT pg_advisory_xact_lock(78124601)');
    await client.query(`CREATE TABLE IF NOT EXISTS beer_map_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const directory = new URL('../db/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort()) {
      const applied = await client.query('SELECT 1 FROM beer_map_migrations WHERE name = $1', [name]);
      if (applied.rowCount) continue;
      await client.query(await readFile(new URL(name, directory), 'utf8'));
      await client.query('INSERT INTO beer_map_migrations (name) VALUES ($1)', [name]);
      console.log(`Applied ${name}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await closeDatabase();
}
