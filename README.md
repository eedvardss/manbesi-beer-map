# Rīgas alus karte

A Riga beer-price map with optional PostgreSQL catalog storage. Research is in `application/app/data/` and the verified venue TypeScript modules; `application/app/venues.ts` assembles published venues. See [Docker and PostgreSQL setup](docs/docker-postgres.md).

The website loads its catalog through `/api/venues`, including opening hours.
Docker runs the complete frontend → REST API → PostgreSQL flow; refresh updates
the displayed database data without rebuilding the app.

See [competitor research](docs/competitor-research.md) and [current progress](docs/DEVELOPMENT.md).

## Repository layout

- `application/`: the web app (Vinext source, API routes, database scripts, tests, `package.json`, Wrangler configuration).
- `infrastructure/`: `Dockerfile`, `Dockerfile.dockerignore` and `compose.yaml`. The Docker build context is the repository root; the dockerignore admits only `application/`.
- `playwright/`: reserved for end-to-end tests; empty for now. The current browser test is `application/scripts/check-mobile-interactions.mjs`.
- `docs/`: design, performance, competitor research, Docker notes and `DEVELOPMENT.md`.
- `.github/`: CI workflows, which run npm commands in `application/`.

## Shared catalog

`GET /api/venues` returns the same sourced venues, complete beer servings, and opening-hour evidence used by the website. Schema version 1 includes currency and the original research date. Responses support ETags and conditional requests. No personal data or authentication is needed.

Download time and research time remain separate; this milestone's source evidence was last checked on 4 September 2026.

## Development and verification

Use Node 22.13 or newer. Run all npm commands from `application/`:

```sh
cd application
npm ci
```

- `npm run dev`: local map on http://localhost:5173 (Vite default; the Docker stack serves on 3000).
- `npm run check`: lint, TypeScript, price/filter regression tests, menu checks, timeline helpers, and the complete published-data audit.
- `npm audit`: dependency security check. The `fflate` override updates the older transitive copy used by Satori; keep it until the upstream pin is updated.
- `npx playwright install chromium`: one-time setup for browser tests.
- With the local server running, `npm run test:browser`: real desktop/mobile interactions, keyboard focus, filters, unknown volumes, and timeline alignment. It defaults to http://localhost:3000/ (the Docker stack); set `BEER_MAP_TEST_URL=http://localhost:5173/` for the dev server or another local build.
- With the local server running, `npm run check:all` runs all checks, including the browser suite.
- `npm run build`: deployment build; automatically runs the lint, type, unit, and data checks first. Run browser tests before publishing.

Serving identity and source rules are documented in `application/app/data/README.md`. Never fix a validation conflict by arbitrarily dropping a verified size or choosing a lower price. Preserve package and draught/bottle distinctions.

MapLibre 6 requires a bundled worker URL. The map uses Vite's `?worker&url` entry so the worker and shared module are emitted together. Verify the production build in the browser after dependency changes, including map tiles, filters, marker focus, mobile details, and the timeline.

## Hosting

Source: https://github.com/eedvardss/manbesi-beer-map (private repository).
Primary domain: https://aluskarte.lv/ (with https://www.aluskarte.lv/ also attached).

`npm run deploy` (from `application/`) builds and publishes directly to the dedicated `aluskarte` Cloudflare Worker. The built Wrangler configuration attaches both custom domains. Account-named `workers.dev` and version preview URLs are disabled, and public client source maps are not emitted. Use the existing authorized Wrangler session; authenticate with project-local Wrangler only when needed. There is no ChatGPT Sites deployment dependency.

The legacy manbesi.lv installation remains separate: `manbesi-p2p` routes its map through the private `BEER_MAP` service binding to `manbesi-beer-map`. Do not alter those Workers or the independent protected `/p2p/` and status API routes when deploying Aluskarte. See `docs/DEVELOPMENT.md` for live validation and DNS activation status.

GitHub Actions runs build and data checks on pushes and pull requests. Deployment is currently via `npm run deploy`; automatic publishing is not configured.
