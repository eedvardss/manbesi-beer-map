import { resolve } from 'node:path';
import { loadDatabaseConfiguration } from './runtime-config.mjs';
import { startTelemetry } from './telemetry.mjs';

loadDatabaseConfiguration();
const telemetry = startTelemetry();
const { startProdServer } = await import('vinext/server/prod-server');
const { server } = await startProdServer({
  outDir: resolve('dist'), port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
});
telemetry.observe(server);

let draining = false;
async function shutdown(signal) {
  if (draining) return;
  draining = true;
  globalThis.__beerMapDraining = true;
  console.log(`Draining HTTP connections (${signal})`);
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    console.error('Graceful shutdown deadline exceeded');
    process.exit(1);
  }, 20000);
  deadline.unref();
  try {
    await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
    await globalThis.__beerMapCloseDatabase?.();
    await telemetry.shutdown();
    clearTimeout(deadline);
    console.log('HTTP server and database pool closed');
  } catch {
    console.error('Graceful shutdown failed');
    process.exitCode = 1;
  }
}
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });
