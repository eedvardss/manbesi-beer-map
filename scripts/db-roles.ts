import { readFile } from 'node:fs/promises';
import { database, closeDatabase } from '../lib/database';

// Run only in the privileged migration job, never in the web process.
try {
  const role = process.env.DATABASE_APP_USER ?? 'beer_map_reader';
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(role)) throw new Error('Invalid application database role');
  const passwordPath = process.env.DATABASE_APP_PASSWORD_FILE;
  if (!passwordPath) throw new Error('Application password file is required');
  const password = (await readFile(passwordPath, 'utf8')).trim();
  if (password.length < 20) throw new Error('Application password must have at least 20 characters');
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78124601)');
    const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    const verb = exists.rowCount ? 'ALTER' : 'CREATE';
    const formatted = await client.query<{ command: string }>(
      `SELECT format('${verb} ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', $1::text, $2::text) AS command`,
      [role, password],
    );
    await client.query(formatted.rows[0].command);
    await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await client.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await client.query(`GRANT SELECT ON beer_map_catalog TO "${role}"`);
    await client.query('COMMIT');
    console.log('Application database role configured with catalog SELECT access');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await closeDatabase();
}
