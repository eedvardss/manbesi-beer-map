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

Install Docker with Compose v2. The Docker files live in `infrastructure/docker/`; the
image builds from the repository-root context and uses
`infrastructure/docker/Dockerfile.dockerignore`. Compose reads `.env` from the compose
file's directory, so the file goes in `infrastructure/docker/.env`. From the repository
root:

```powershell
Copy-Item application/.env.example infrastructure/docker/.env
# Edit infrastructure/docker/.env and set POSTGRES_PASSWORD to a long random URL-safe password.
docker compose -f infrastructure/docker/compose.yaml up --build -d --wait
```

The remaining `docker compose` examples assume `-f infrastructure/docker/compose.yaml`
(or running them from `infrastructure/docker/`).

Open http://localhost:3000. Change `APP_PORT` in `infrastructure/docker/.env` if that port is occupied.
The app port is published on all host interfaces, allowing access from other
devices. For local-only access, use `127.0.0.1:${APP_PORT:-3000}:3000` instead.
Run `npx tsx scripts/check-container.ts` from `application/` on the host (set
`BEER_MAP_TEST_URL`, e.g. `http://127.0.0.1:3300`, if `APP_PORT` is not 3000) to verify the page, a
JavaScript asset, PostgreSQL health, complete catalog equality and ETag 304s.
The database stays on the internal Compose network. `/api/health` returns 200
only when the configured catalog can be read, and identifies `postgres` or
`file` as the catalog backend.

Compose waits for PostgreSQL's health check, runs versioned migrations and
seeds an empty database, then starts the app. The named `postgres_data` volume
survives container replacement and `docker compose down`. Startup preserves
an existing catalog.

## Image

`infrastructure/docker/Dockerfile` builds on `node:22.x-trixie-slim` and runs on
`gcr.io/distroless/nodejs22-debian13:nonroot`, both pinned by digest. The
runtime has no shell, package manager, npm, corepack or perl. After the Docker
build, vinext's standalone emitter copies only the packages the server bundle
leaves external (`pg`, `react`, `react-dom`, `ipaddr.js`) plus vinext's own
runtime chain; `sharp` is dropped because `next/og` is unused. App files are
root-owned and read-only; the process runs as uid 65532. Compose additionally
sets `read_only`, `cap_drop: [ALL]` and `no-new-privileges` for the app and
setup containers. The image `HEALTHCHECK` calls `/api/health` on `$PORT`.
The entrypoint is `node`, so a Compose `command` is a script path. For a shell
while debugging, temporarily swap in the `:debug-nonroot` distroless tag.
Docker Hub images (the Node build stage, PostgreSQL, the Dockerfile frontend and
CI's BuildKit) are pulled through Google's mirror `mirror.gcr.io` with the same
tags and digests, avoiding anonymous Docker Hub rate limits on shared runners.

Scan with Trivy (no fixable HIGH/CRITICAL findings on 9 October 2026):

```powershell
docker run --rm -v //var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.70.0 image --severity HIGH,CRITICAL --ignore-unfixed beer-map:local
```

`db-setup` runs `scripts/setup-database.mjs` (source: `application/scripts/`) with the built app image.
It applies migrations, seeds an empty database and, when `PRICE_SUGGESTIONS_ENABLED=true`
(`compose.prices.yaml`), configures the restricted price roles. Keeping
this as a one-shot service ensures versioned migrations run against existing
volumes as well as new databases. PostgreSQL initialization scripts run only
when its data directory is empty; the PostgreSQL image also lacks the Node
runtime used by the migration and seed commands. A setup failure prevents
the app from starting. This service can become a migration Job in Kubernetes.

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

After editing the sourced venue files, rebuild the image. Explicitly seed to
replace the existing PostgreSQL catalog:

```powershell
docker compose build
docker compose run --rm db-setup dist/db/db-seed.js
docker compose up -d --wait
```

`db:seed` / `db:seed:docker` (`dist/db/db-seed.js` in the image) replace the published document; setup only seeds
if it is absent. Docker runs compiled migration and seed JavaScript, with
production dependencies and built assets rather than the full source tree.
With `DATABASE_URL` configured, missing data or database errors produce an
uncached 503 response rather than silently serving a different catalog.
Conditional API requests retain weak/list ETag matching and 304 responses.

## Local Node verification

```powershell
cd application
npm ci
npm ls --all
npm run build:docker
$env:PORT = '3001'
npm run start:docker
```

To use a reachable external database, set `DATABASE_URL` in the process
environment (the tsx commands do not automatically load `.env`), then run
`npm run db:setup`. TLS parameters can be supplied in the PostgreSQL URL.

Vinext 1.0 treats `application/wrangler.jsonc` as a Cloudflare build. The Docker
context excludes it. For local Node builds, `build-docker.mjs` copies the same
source inputs into a temporary directory under ignored `application/artifacts/`, builds,
copies the output back to `application/dist/`, and removes the temporary directory.
`npm run build` remains the Cloudflare build; both targets replace `dist/`.

Use a dedicated test database for the integration tests; the tests change and
delete its published catalog row:

```powershell
$env:BEER_MAP_TEST_DATABASE_URL = 'postgresql://user:password@localhost:5432/beer_map_test'
npm run test:postgres
```

CI starts a disposable PostgreSQL service for the integration tests. Those
tests exercise real transactions, constraints, revision triggers, repeatable
migrations and failure handling. They intentionally modify and delete catalog
data, so their dedicated test database is separate from the Compose database
used for container and browser checks. Neither service connects to production.
The same job runs `test:prices:postgres` against a second disposable database
(`beer_map_prices_test`), `test:browser` against the Compose app, and the
Playwright Test suite (`npm run test:browser:suite`), whose fixture starts its
own price-enabled Compose project (`beer-map-playwright`, port 3011).

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
At that time the stack was left running locally; credentials are in the ignored
`.env` file. This verification does not deploy to GKE or public
hosting and does not establish browser interaction or performance results.

## Hardened image — 9 October 2026

The distroless/standalone image is 203,315,947 bytes (previously 590,981,350).
Trivy 0.69.3 HIGH/CRITICAL with `--ignore-unfixed` went from 21 (7 Debian
`perl-base`, 10 in the base image's bundled npm, 4 app dependencies) to 0;
`trivy config` reports no Dockerfile misconfigurations. An isolated Compose
project (`-p beer-map-e2e`, `APP_PORT=3300`) built, migrated, seeded 165
venues, became healthy, passed `check-container.ts`, and was removed with
`down -v`. Not deployed.
