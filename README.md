# Rīgas alus karte

A file-based Riga beer-price map. Research is in `app/data/` and the verified venue TypeScript modules; `app/venues.ts` assembles published venues. No database is used.

The native iPhone companion lives in `ios/BeerMap.xcodeproj`. See [iPhone setup and verification](ios/README.md), [competitor research](docs/competitor-research.md), and [current progress](DEVELOPMENT.md). It uses SwiftUI, MapKit, local saved places, and a bundled catalog for browsing without a successful API connection.

## Shared catalog

`GET /api/venues` returns the same sourced venues, complete beer servings, and opening-hour evidence used by the website. Schema version 1 includes currency and the original research date. Responses support ETags and conditional requests. No personal data or authentication is needed.

After changing published data, run `npm run sync:ios-data` to update `ios/BeerMap/Resources/venues.json`. `npm run check:ios-data` fails if the snapshot diverges. Download time and research time remain separate; this milestone's source evidence was last checked on 4 September 2026.

## Development and verification

Use Node 22.13 or newer and `npm ci`.

- `npm run dev`: local map on http://localhost:3000.
- `npm run check`: lint, TypeScript, price/filter regression tests, menu checks, timeline helpers, and the complete published-data audit.
- `npm audit`: dependency security check. The `fflate` override updates the older transitive copy used by Satori; keep it until the upstream pin is updated.
- `npx playwright install chromium`: one-time setup for browser tests.
- With the local server running, `npm run test:browser`: real desktop/mobile interactions, keyboard focus, filters, unknown volumes, and timeline alignment. Set `BEER_MAP_TEST_URL` to test another local build.
- With the local server running, `npm run check:all` runs all checks, including the browser suite.
- `npm run build`: deployment build; automatically runs the lint, type, unit, and data checks first. Run browser tests before publishing.

Serving identity and source rules are documented in `app/data/README.md`. Never fix a validation conflict by arbitrarily dropping a verified size or choosing a lower price. Preserve package and draught/bottle distinctions.

MapLibre 6 requires a bundled worker URL. The map uses Vite's `?worker&url` entry so the worker and shared module are emitted together. Verify the production build in the browser after dependency changes, including map tiles, filters, marker focus, mobile details, and the timeline.

## Hosting

Source: https://github.com/eedvardss/manbesi-beer-map (private repository).
Production: https://manbesi.lv/.

`npm run deploy` builds and publishes directly to the `manbesi-beer-map` Cloudflare Worker in the owner's account. Authenticate with `npx wrangler login` first. There is no ChatGPT Sites plugin, source repository, token, or deployment dependency.

The domain's existing `manbesi-p2p` Worker routes the map through a private Cloudflare service binding named `BEER_MAP`. This preserves the independent protected `/p2p/` and status API routes. Its source is in the `eedvardss/edvards.lv` repository. Both `/` and the existing `/alus` map entry work.

GitHub Actions runs build and data checks on pushes and pull requests. Deployment is currently via `npm run deploy`; automatic publishing is not configured.
