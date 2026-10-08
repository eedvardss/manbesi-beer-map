# Docker and PostgreSQL

This branch adds a separate Node deployment alongside the existing Cloudflare
deployment. `DATABASE_URL` enables PostgreSQL for `/api/venues`; without it, the
API uses the file catalog. The website loads venues, all servings and opening
hours from that API. With Compose the full flow is frontend → REST API →
PostgreSQL. Original research files remain the audited seed source.

Initial loading and failures have explicit states and a retry action. The
refresh button and returning to a visible page after 30 seconds revalidate the
catalog. An unchanged 304 preserves the prepared search indexes and marker DOM.
A failed refresh keeps the last successful catalog and displays a notice;
initial failures never silently substitute bundled venue data. Refresh retains
filters and selection, and changed coordinates update existing markers.

## Run the stack

Install Docker with Compose v2. From the repository directory:

```powershell
Copy-Item .env.example .env
# Edit .env and set POSTGRES_PASSWORD to a long random URL-safe password.
docker compose up --build -d --wait
```

Open http://localhost:3000. Change `APP_PORT` in `.env` if that port is occupied.
Run `node scripts/check-container.mjs` from the host to verify the page, a
JavaScript asset, PostgreSQL health, complete catalog equality and ETag 304s.
The database stays on the internal Compose network. `/api/health` returns 200
only when the configured catalog can be read, and identifies `postgres` or
`file` as the catalog backend.

Compose waits for PostgreSQL's health check, runs versioned migrations and
seeds an empty database, then starts the app. The named `postgres_data` volume
survives container replacement and `docker compose down`. Startup preserves
an existing catalog. The app runs as the unprivileged Node user.

```powershell
docker compose logs -f app db-setup
docker compose down
```

## Update catalog data

The database stores the complete schema-v1 catalog document in
`beer_map_catalog.payload`. Keeping all servings, source links, uncertainty and
research dates together preserves the API contract and exact ETag bytes.
Numbered SQL migrations are transactional and serialized with a PostgreSQL
advisory lock. Applied migrations are recorded in `beer_map_migrations`.

After editing the sourced venue files, sync the native snapshot and rebuild
the image. Explicitly seed to replace the existing PostgreSQL catalog:

```powershell
npm run sync:ios-data
docker compose build
docker compose run --rm db-setup npm run db:seed:docker
docker compose up -d --wait
```

`db:seed` / `db:seed:docker` replace the published document; setup only seeds
if it is absent. Docker runs compiled migration and seed JavaScript, with
production dependencies and built assets rather than the full source tree.
With `DATABASE_URL` configured, missing data or database errors produce an
uncached 503 response rather than silently serving a different catalog.
Conditional API requests retain weak/list ETag matching and 304 responses.

## Local Node verification

```powershell
npm ci
npm ls --all
npm run build:docker
$env:PORT = '3001'
npm run start:docker
```

To use a reachable external database, set `DATABASE_URL` in the process
environment (the tsx commands do not automatically load `.env`), then run
`npm run db:setup`. TLS parameters can be supplied in the PostgreSQL URL.

Vinext 1.0 treats a root `wrangler.jsonc` as a Cloudflare build. The Docker
context excludes it. For local Node builds, `build-docker.mjs` copies the same
source inputs into a temporary directory under ignored `artifacts/`, builds,
copies the output back to `dist/`, and removes the temporary directory.
`npm run build` remains the Cloudflare build; both targets replace `dist/`.

Use a dedicated test database for the integration tests; the tests change and
delete its published catalog row:

```powershell
$env:BEER_MAP_TEST_DATABASE_URL = 'postgresql://user:password@localhost:5432/beer_map_test'
npm run test:postgres
```

The WebAssembly helper dependencies `@emnapi/core` and `@emnapi/runtime` are
pinned explicitly because npm 11 omitted their entries from this project's
optional-package lock graph, causing `npm ls --all` failures after `npm ci`.

Implementation references: [Vinext Node server](https://github.com/cloudflare/vinext/blob/main/README.md),
[Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/),
[PostgreSQL image and volume layout](https://hub.docker.com/_/postgres),
and [node-postgres pools](https://node-postgres.com/apis/pool).

## Verified container startup — 8 October 2026

The subsequent frontend integration reduces the image from 1,418,487,088 to
904,065,937 bytes. Docker-target builds now precompress static assets for
Brotli/gzip delivery. A second migration adds a revision trigger, so even direct
SQL changes invalidate the one-snapshot API cache. Unchanged API requests check
the revision without transferring the full document from PostgreSQL; health
checks query only the published row's existence.

Built and started the actual stack on Docker Desktop 4.94.0, Engine 29.8.2
(Linux amd64), Compose 5.5.1, Node 22.23.3 and PostgreSQL 17.11. The in-image
lint/type/test/data/snapshot checks and production build passed. Both app and
database are healthy; the setup container exits successfully after migration
and seed. SQL confirms 165 venues and 2,550 servings. The API matches the
source snapshot, returns conditional 304s, and the page and JS asset return 200.

Recreated the stack with `docker compose down` followed by `docker compose up
-d --wait` while retaining its named volume. The catalog checksum and update
timestamp remained identical, migrations were not repeated, and startup
reported `Existing catalog preserved`. The app runs as uid 1000 (`node`).
The stack is left running locally at http://localhost:3000. Credentials are
in the ignored `.env` file. This verification does not deploy to GKE or public
hosting and does not establish browser interaction or performance results.
