# Beer Map development log

## Direction

Build a clean native iPhone companion to manbesi.lv and improve both products independently. Preserve sourced prices and clear serving comparisons. A five-hour continuation named “Build Beer Map for iPhone and web” is active in this chat.

## Current milestone — 2 October 2026

**Design status:** the user rejected the first native visual pass on 2 October. Treat the implementation below as a functional baseline, not an approved design. The quality bar and five-hour automation now prioritize clarity, deliberate visual design and rendered review before additional feature breadth. See `docs/design-direction.md` for current research, distinct native drafts and the provisional recommendation.

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

## Native design study — 2 October 2026

Added three structurally distinct DEBUG-only native drafts: A map-led, B editorial city guide, C flat price comparison. A is the provisional working recommendation; no user review or approval is inferred. All use the real bundled catalog and exact 500 ml by default (131 matching venues). Shared detail has one walking action, complete menu and contextual source disclosure. Study filters/bookmarks are in memory and do not alter product preferences or cache. Run `npm run design:ios -- A`; see `docs/design-direction.md`.

Validation: eight unit tests and the two existing product UI tests passed on iPhone 17 Pro / iOS 26.5. A focused draft UI check also passed on iPhone 17e / iOS 26.5: search, opening/closing details, saving and viewing a place, A/B/C switching, correct 6.30 EUR/l comparison after including the 3 l serving, full-row map action, and empty-search recovery. This check was added after rendered review exposed a missing sheet environment and an incomplete tap area; both were fixed and exercised. Debug and Release simulator builds pass, and the Release executable excludes the prototype. Bundled catalog equality passes using `node --import tsx scripts/sync-ios-catalog.ts --check`; the npm CLI wrapper needs sandbox IPC access.

Rendered review covered all three native layouts, loaded map tiles, and all three at accessibility text size in dark appearance on the smaller iPhone 17e. A also has a larger place panel at accessibility sizes and a clear status area. Returning from a map detail clears annotation selection; the same pin was reopened after dismissing the long-name Tallink Hotel detail in the actual native mirror. Simulator mirroring provides an actual interactive native frame in the background browser; it is not a web imitation. XcodeBuildMCP's runtime accessibility snapshot sometimes returned an empty tree after test runs, so browser interaction and XCUITest supplied the interaction evidence. The normal production app and live website were not switched to these drafts.

Ignored proof images are in `artifacts/design-*.jpg`. Xcode results are under `/Users/edvards/Library/Developer/XcodeBuildMCP/workspaces/Beer-Map-d07dfe114b1f/result-bundles/`: `test_sim_2026-10-01T23-43-06-418Z_pid6794_5249389a.xcresult` (ten checks) and `test_sim_2026-10-02T00-02-22-980Z_pid6794_5c02ea09.xcresult` (draft flow). The active mirror is pinned to iPhone 17 Pro, http://localhost:3201/, started by the preview script in terminal session 4877. Keep it available for review; clean it up with the simulator-specific serve-sim command when no longer in use, and avoid duplicate mirrors.

Remaining design work: refine visible-map/list coordination, dense pin hierarchy, long names and source/menu grouping. Continue with A unless feedback points elsewhere. Review the original product's denied-location state separately; the draft does not establish that coverage. No new venue-price research, physical-device installation or App Store release occurred in this design pass.

## Performance pass — 2 October 2026

The user now explicitly requires excellent speed on both platforms and authorizes independent revisions to the existing five-hour task. The heartbeat `build-beer-map-for-iphone-and-web` was updated successfully and its saved configuration verified: active, same five-hour cadence, quiet background work, performance and design before feature breadth, representative measurements and budgets, and authority to revise priorities without duplicate schedules. See `docs/performance.md` for requirements, reproducible measurements, limits and profiling priorities.

Implemented: prepared catalog search indexes, one-pass winning-serving selection, a bounded one-input native query cache with correct invalidation, a prepared native catalog-date label, reused web formatters, memoized web rows, and fewer updates to unchanged web/native markers. The website's renderer is now a deferred chunk with its self-contained worker; the search/list page can hydrate first. Pending venue choices and permalinks are retained. A quiet map initialization failure/retry state is available.

Measurements on the arm64 Mac/macOS 26.5.1, using the real catalog: web mixed-query median 0.627 → 0.063 ms, native optimized Swift model/store 1.596 → 0.511 ms, with matching result checksums. These are eight-query batch averages, not device startup or frame-rate evidence. Initial page gzip is 494,579 → 211,103 bytes; the deferred map renderer still adds 277,315 gzip bytes. The new postbuild budget caps initial page JS at 1,000,000 raw / 250,000 gzip bytes. This does not budget total transfer.

Validation completed:

- `npm run build` exits successfully, including lint/types, eleven serving/API tests, existing menu/timeline checks, complete venue audit, bundled snapshot equality, production build and the new size budget. Raw measurements and logs are in ignored `artifacts/performance/`.
- Twelve native tests (nine unit and three UI) pass on iPhone 17 Pro / iOS 26.5. New coverage exercises cached/indexed query equivalence, bookmarks, location, clock and catalog replacement. Debug and Release simulator builds pass. Result: `/Users/edvards/Library/Developer/XcodeBuildMCP/workspaces/Beer-Map-d07dfe114b1f/result-bundles/test_sim_2026-10-02T00-34-01-821Z_pid6794_626f200a.xcresult`.
- The rebuilt background production preview renders real map tiles and price markers. Desktop checks cover ALA price/litre selection, retained keyboard focus, full menu, IPA + 5–6 € and unknown-volume presentation. Compact mobile review uses an observed 391 × 845 CSS viewport: permalink/list selection, repeated selection at the current zoom, drawer closure, all 73 ALA menu entries, settled panel bounds within the viewport, user zoom dismissal, empty search and recovery to 165 results. Console error inspection is empty. Temporary device/viewport overrides were reset.
- Mobile review exposed an existing camera-animation race: selecting a place while already at the target zoom could close its detail. Programmatic venue movements now carry selection-preserving event data; user zoom still dismisses details. The corresponding reopen scenario is added to the browser regression script and exercised through the actual background browser. The standalone headless browser script was not rerun in this pass.
- Initial production HTML was inspected: it preloads the page chunk and has no map-runtime preload. The runtime loads after hydration. This is evidence of loading order, not a measured improvement to useful startup.

Current work is verified locally; this pass has not been deployed to manbesi.lv or installed on a physical iPhone. The normal native visual direction remains unapproved; draft A is still provisional and the mirror remains available. The local web preview runs at http://localhost:3017/ in terminal session 74171. No catalog prices or source dates changed, and pre-existing `research/` remains outside this pass.

## Next work

The first functional milestone is complete; visual design remains provisional. Prioritize the native redesign:

1. Refine the map-led draft with strong hierarchy, less chrome, useful place density, exact serving context and coherent details. Continue independently with the provisional recommendation; don't equate it with user approval. Keep B/C available for comparison until reviewed, then remove losing drafts and implement the reviewed direction properly.
2. Verify remaining native dark mode, accessibility sizes, smaller-screen, keyboard, long-name, empty/saved and denied-location states. Fix observed defects before expanding scope.
3. Measure useful startup and representative scrolling/search/map interactions with production browser and native Release traces. Profile decoding, requests, marker work, memory and idle costs; implement conditional native refresh and off-main work when evidence supports it. See `docs/performance.md`; do not turn microbenchmarks into device speed claims.
4. Apply useful, visually coherent website parity: saved places and exact serving-size filters, within the startup and interaction budgets.
5. Improve source freshness per venue with actual menu evidence and distinct dates, and investigate the web map's dense overview with rendered/performance evidence.
6. Prepare TestFlight when authorized signing/distribution access is available.

Keep the five-hour continuation active. Work quietly while nothing meaningful changes; report verified milestones, concrete failures, or required user action. Preserve unrelated changes and commit completed slices.
