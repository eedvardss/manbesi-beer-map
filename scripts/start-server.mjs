import { startProdServer } from 'vinext/server/prod-server';
import { resolve } from 'node:path';

await startProdServer({
  outDir: resolve('dist'), port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
});
