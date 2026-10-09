import { readFileSync } from 'node:fs';

export function loadDatabaseConfiguration(env = process.env) {
  if (env.DATABASE_URL && env.DATABASE_URL_FILE) throw new Error('Configure one database URL source');
  if (env.DATABASE_URL_FILE) env.DATABASE_URL = readFileSync(env.DATABASE_URL_FILE, 'utf8').trim();
  if (!env.DATABASE_URL && env.DATABASE_HOST) {
    const password = env.DATABASE_PASSWORD_FILE
      ? readFileSync(env.DATABASE_PASSWORD_FILE, 'utf8').trim() : env.DATABASE_PASSWORD;
    if (!password || !env.DATABASE_USER || !env.DATABASE_NAME) throw new Error('Incomplete database configuration');
    const url = new URL('postgresql://localhost');
    url.hostname = env.DATABASE_HOST;
    url.port = env.DATABASE_PORT ?? '5432';
    url.username = env.DATABASE_USER;
    url.password = password;
    url.pathname = `/${env.DATABASE_NAME}`;
    env.DATABASE_URL = url.href;
  }
  if (env.BEER_MAP_REQUIRE_DATABASE === 'true' && !env.DATABASE_URL) {
    throw new Error('Database configuration is required for this deployment');
  }
}
