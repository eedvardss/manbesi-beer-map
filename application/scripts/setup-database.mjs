// One-shot Compose setup: apply migrations, seed only an empty database, then
// (with the opt-in price feature) configure the restricted runtime roles.
// Plain Node (no shell) so it runs in the distroless runtime image.
import { execFileSync } from 'node:child_process';

const run = (...args) => execFileSync(process.execPath, args, { stdio: 'inherit' });
run('dist/db/db-migrate.js');
run('dist/db/db-seed.js', '--if-empty');
if (process.env.PRICE_SUGGESTIONS_ENABLED === 'true') run('dist/db/db-price-roles.js');
