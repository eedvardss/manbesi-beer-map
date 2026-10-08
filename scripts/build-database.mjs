import { build } from 'esbuild';
import { cp } from 'node:fs/promises';

await build({
  entryPoints: ['scripts/db-migrate.ts', 'scripts/db-seed.ts'],
  outdir: 'dist/db', bundle: true, platform: 'node', format: 'esm',
  target: 'node22', external: ['pg'],
});
await cp('db/migrations', 'dist/db/migrations', { recursive: true });
