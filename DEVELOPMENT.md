# Beer Map development log

## Direction

Build a clean native iPhone companion to manbesi.lv and improve both products independently. Preserve sourced prices and clear serving comparisons. A five-hour continuation named “Build Beer Map for iPhone and web” is active in this chat.

## Current milestone — 2 October 2026

Implemented: SwiftUI iPhone app, native clustered MapKit map, searchable places, saved places, serving-size and price filters, walking directions, sharing, source details, and offline catalog with remote refresh. The app uses iOS 26 standard controls and Liquid Glass. Deployment target is iOS 26.0; the installed SDK and tested simulator are iOS 26.5. iOS 27 is not yet verified.

Implemented for the website: shared read-only catalog endpoint at `/api/venues`, ETags, bundled snapshot consistency check, marker prices and colors that match litre comparison, walking directions, and venue permalinks. All 165 venues and 2,550 servings retain the original research date of 4 September 2026. No new menu-price research is implied.

Dependencies were updated to a working current Cloudflare runtime and MapLibre 6, with its explicit Vite worker bundle. `npm audit` reports no known dependency vulnerabilities after the transitive `fflate` override.

Validation completed:

- `npm run build`: lint, TypeScript, ten serving/API/marker tests, existing menu/timeline checks, full data audit, bundled snapshot equality, and production build pass.
- Native Xcode tests: seven unit tests and two interaction tests pass on iPhone 17 Pro / iOS 26.5. Tests cover all venue litre comparisons, serving/search/band consistency, hours through midnight, distance, bookmark persistence, deep links, valid cache refresh and failed/malformed refresh fallback, filters, venue details, and empty results.
- Unsigned device Release build passes. This confirms compilation; no physical-device installation or TestFlight release has occurred.
- Reviewed simulator screenshots are in ignored `artifacts/iphone-map.png`, `iphone-saved.png`, and `iphone-venue.png`. Test results: `artifacts/ios-final.xcresult`.
- Background browser confirms production-preview map tiles, keyboard marker focus, litre marker units/colors, unknown-volume markers, source/direction links, and clipboard permalinks. At a true 390 × 844 CSS viewport, shared links open the correct venue, details stay within the viewport, IPA + 5–6 € selects the correct 500 ml serving, the drawer closes on selection, and timeline/zoom/pan controls work. Temporary viewport overrides were reset.
- The actual Swift store and decoder loaded all 165 venues / 2,550 servings from the live API and persisted its valid cache in an isolated command-line probe. No user bookmarks or location were used.

Scoped commits: `2afebf1` — shared API, offline snapshot, website improvements, and dependency migration; `78f9279` — native app, project, tests, and competitor research. The final cache fix and production notes form the following commit. These commits are local on `codex/iphone-app`; no push or PR has been created.

Production verified on 2 October 2026: `manbesi-beer-map` version `df89414e-0192-4990-abb7-348a7ebd951a`, live through https://manbesi.lv/. API JSON matches the bundled snapshot exactly, ignoring the snapshot file's trailing newline. GET returns 200; conditional GET with the production weak ETag returns 304 with no body. Weak and list validators have a regression test because Cloudflare compression weakens the response tag. Existing route checks: `/` 200, `/alus` 200, `/p2p/` 302, `/api/status` 200. The live rendered map has 165 pins, opens the shared venue, and exposes its walking-directions link without console errors.

The active thread heartbeat is `build-beer-map-for-iphone-and-web`, every five hours. It continues independent bounded milestones in this workspace, with occasional scoped commits and meaningful milestone/failure notifications. Local execution requires this Mac and Codex to be running.

Research and product decisions: `docs/competitor-research.md`. This workspace was connected to the existing `eedvardss/manbesi-beer-map` repository on branch `codex/iphone-app`. The old checkout is preserved. Pre-existing `research/` files remain outside milestone commits.

## Next work

The first milestone is complete. Continue with high-value improvements from the competitor research:

1. Native dark mode, Dynamic Type, smaller-screen coverage, and denied-location verification.
2. Useful website parity: saved places and exact serving-size filters.
3. Source freshness per venue, with real evidence and distinct menu dates.
4. Performance work for the web map's large client bundle and dense overview pins.
5. TestFlight preparation once authorized Apple signing/distribution access is available.

Keep the five-hour continuation active. Work quietly while nothing meaningful changes; report verified milestones, concrete failures, or required user action. Preserve unrelated changes and commit completed slices.
