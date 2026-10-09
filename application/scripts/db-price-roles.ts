import { database, closeDatabase } from '../lib/database';

// Trusted setup only. Neither HTTP connection uses the database-owner login.
try {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78124601)');
    await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    for (const [role, variable] of [
      ['beer_map_app', 'APP_DATABASE_PASSWORD'],
      ['beer_map_reviewer', 'REVIEW_DATABASE_PASSWORD'],
    ]) {
      const password = process.env[variable];
      if (!password || password.length < 24)
        throw new Error(`Set a strong ${variable}`);
      const exists = await client.query(
        'SELECT 1 FROM pg_roles WHERE rolname=$1',
        [role],
      );
      const { rows } = await client.query<{ command: string }>(
        `SELECT format('${exists.rowCount ? 'ALTER' : 'CREATE'} ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',$1::text,$2::text) AS command`,
        [role, password],
      );
      await client.query(rows[0].command);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
      await client.query(
        `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}`,
      );
      await client.query(
        `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${role}`,
      );
    }
    await client.query(
      'GRANT SELECT ON beer_map_catalog,beer_map_servings,beer_map_current_prices TO beer_map_app',
    );
    await client.query(
      'GRANT EXECUTE ON FUNCTION beer_map_submit_price(UUID,INTEGER,INTEGER,TEXT,UUID,TEXT,TEXT) TO beer_map_app',
    );
    await client.query(
      'GRANT SELECT ON beer_map_servings,beer_map_price_suggestions,beer_map_current_prices,beer_map_price_changes TO beer_map_reviewer',
    );
    await client.query(
      'GRANT EXECUTE ON FUNCTION beer_map_review_price(UUID,TEXT,TEXT,DATE,TEXT),beer_map_revert_price(UUID,INTEGER,TEXT),beer_map_price_login_limit() TO beer_map_reviewer',
    );
    await client.query('COMMIT');
    console.log('Restricted submission and reviewer database roles configured');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await closeDatabase();
}
