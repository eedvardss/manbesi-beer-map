import { loadDatabaseConfiguration } from './runtime-config.mjs';

loadDatabaseConfiguration();
process.argv.push('--if-empty');
await import('../dist/db/db-migrate.js');
await import('../dist/db/db-seed.js');
if (process.env.DATABASE_APP_PASSWORD_FILE) await import('../dist/db/db-roles.js');
