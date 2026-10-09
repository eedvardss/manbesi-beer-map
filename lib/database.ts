import pg from 'pg';

let pool: pg.Pool | undefined;

export function assertDatabaseConfiguration() {
  if (process.env.BEER_MAP_REQUIRE_DATABASE === 'true' && !databaseConfigured()) {
    throw new Error('DATABASE_URL is required in PostgreSQL deployment mode');
  }
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function database() {
  if (!databaseConfigured()) throw new Error('DATABASE_URL is required for database commands');
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  });
  // The built route bundle and the Node entrypoint share this shutdown hook.
  (globalThis as typeof globalThis & { __beerMapCloseDatabase?: typeof closeDatabase })
    .__beerMapCloseDatabase = closeDatabase;
  // An idle connection can fail between requests; do not crash the server.
  if (pool.listenerCount('error') === 0) {
    pool.on('error', () => console.error('PostgreSQL idle connection failed'));
  }
  return pool;
}

export async function closeDatabase() {
  const current = pool;
  pool = undefined;
  await current?.end();
}
