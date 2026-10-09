// One-shot Compose setup: apply migrations, then seed only an empty database.
// Plain Node (no shell) so it runs in the distroless runtime image.
import { execFileSync } from 'node:child_process';

const run = (...args) => execFileSync(process.execPath, args, { stdio: 'inherit' });
run('dist/db/db-migrate.js');
run('dist/db/db-seed.js', '--if-empty');
