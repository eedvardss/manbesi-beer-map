# Rīgas alus karte

A file-based Riga beer-price map. Research is in `app/data/` and the verified venue TypeScript modules; `app/venues.ts` assembles published venues. No database is used.

## Development and verification

Use Node 22.13 or newer and `npm ci`.

- `npm run dev`: local map on http://localhost:3000.
- `npm run check`: lint, TypeScript, price/filter regression tests, menu checks, timeline helpers, and the complete published-data audit.
- `npx playwright install chromium`: one-time setup for browser tests.
- With the local server running, `npm run test:browser`: real desktop/mobile interactions, keyboard focus, filters, unknown volumes, and timeline alignment. Set `BEER_MAP_TEST_URL` to test another local build.
- With the local server running, `npm run check:all` runs all checks, including the browser suite.
- `npm run build`: deployment build; automatically runs the lint, type, unit, and data checks first. Run browser tests before publishing.

Serving identity and source rules are documented in `app/data/README.md`. Never fix a validation conflict by arbitrarily dropping a verified size or choosing a lower price. Preserve package and draught/bottle distinctions.
