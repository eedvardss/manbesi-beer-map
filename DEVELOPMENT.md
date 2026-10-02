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

Performance code is committed locally as `aefe114` on `codex/iphone-app`. The verified website changes are published to `manbesi-beer-map`, version `e4dba4c4-d1dd-4f19-8dd9-fa43cb063df1`, with version tag `aefe114`. Used the project-local Wrangler 4.146.0 and built config, checked the existing authenticated account/current deployment, inspected the prior version, passed a dry run and deployed with strict checking. Guidance: [Wrangler skill](https://raw.githubusercontent.com/cloudflare/skills/main/skills/wrangler/SKILL.md) and [current Workers commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

Production verification: `/` 200 with the new page chunk and no initial renderer preload; `/alus` 200; `/p2p/` 302; `/api/status` 200; `/api/venues` 200 with JSON equal to the bundled snapshot, followed by conditional GET 304 with an empty body; deferred runtime chunk 200. The actual live map loads tiles and 165 markers, opens the shared ALA venue with all 73 menu rows, and filters to the correct 18.90 EUR / 3 l / 6.30 EUR/l result. Console error inspection is empty. Ignored deployment and verification evidence is in `artifacts/performance/`.

Native changes are verified locally; no physical-iPhone installation or App Store release occurred. The normal native visual direction remains unapproved; draft A is still provisional and the mirror remains available. The local web preview runs at http://localhost:3017/ in terminal session 74171. No catalog prices or source dates changed, and pre-existing `research/` remains outside this pass. Neither milestone commit has been pushed.

## Native refresh performance — 2 October 2026

Implemented conditional native refresh using the existing API, retaining its opaque weak ETag. A valid 304 clears transient failure state without replacing catalog/search results or writing the cache. Fresh 200 responses are decoded, validated, indexed, formatted and atomically persisted in a detached utility task before acceptance on the main actor. Cancellation is propagated to preparation and does not generate an outage message. A versioned cache stores the validator with its catalog; legacy caches migrate, and rejected caches never lend their validator to the bundled data. No venue data or website source changed.

Measurements use the actual optimized Swift model/store on the arm64 Mac/macOS 26.5.1 with isolated cache/defaults and deterministic transport. Across 25 unchanged refreshes, payload falls from 5,997,325 bytes to zero and median/p95 completion from 5.675/7.419 ms to 0.182/0.300 ms. For forced full responses, median/p95 rises from 5.600/6.620 ms to 8.399/10.026 ms because the new cache re-encodes validated data and runs with utility scheduling; main-actor pulse p95/maximum gaps fall from 6.127/7.108 ms to 2.107/2.502 ms. These scheduling samples do not measure device frames, startup, memory or battery. Cold startup remains synchronous and unprofiled. Reproduction and limits: `docs/performance.md`.

Validation completed:

- All 19 native tests pass (16 unit and three UI) on iPhone 17 Pro / iOS 26.5. New checks cover paired validator/cache relaunch, legacy migration, unchanged cache bytes/modification time and no catalog Observation invalidation, filters/selection/bookmarks, offline recovery, malformed/older cache/response rejection, missing ETags, cancellation and failed writes. Result: `/Users/edvards/Library/Developer/XcodeBuildMCP/workspaces/Beer-Map-d07dfe114b1f/result-bundles/test_sim_2026-10-02T03-35-12-791Z_pid6794_a5d45eff.xcresult`.
- Release simulator build passes with strict Swift concurrency and no warnings. The actual Release app renders loaded map tiles, search results, list and venue detail in the existing background mirror. This is local simulator evidence; no physical-device speed claim is made.
- `scripts/probe-native-refresh.swift` runs the actual store against the live API with URLSession metrics and an isolated cache/defaults suite. It confirms 200 followed by 304, all 165 venues / 2,550 servings, full snapshot equality, unchanged disk bytes/modification time and retained interaction state. The first response transfers 36,946 compressed body bytes (239,892 decoded); the second has zero body bytes. Data remains checked on 4 September 2026.
- Reproducible CPU/scheduling harness: `scripts/benchmark-refresh.swift`, with unchanged and forced-full-response modes. Raw results and Release screenshots are under ignored `artifacts/performance/`.
- `npm run check` passes lint, types, all eleven web serving/API tests, existing menu/timeline checks, the complete data audit and bundled snapshot equality.

This is a scoped local native milestone on `codex/iphone-app`; no push, website deployment, physical-iPhone installation or App Store release occurred. Existing five-hour continuation stays active with its cadence and background intent unchanged; it reads these updated priorities. Draft A remains provisional, and the native mirror stays available. Pre-existing `research/` remains outside commits.

## Native map context and accessible panel — 2 October 2026

Draft A's compact panel now describes places in the visible map area instead of ranking the whole city independently. The full list, saved places and cluster list have explicit, stable membership. An empty map area offers access to all places; empty searches still offer filter recovery. Search editing contracts both the compact and expanded panels. Price labels remain intact, serving sizes remain visible on ordinary rows, and metadata wraps at accessibility sizes. Research/application details are in `docs/design-direction.md`.

Direct pin selection now retains the browse camera rather than entering the programmatic-link centering path. Area membership is published after a settled map/data update and only when its ID set changes. It uses cached ordered results and retained annotations, with no per-frame map callback or new network/disk work. These are implementation constraints; no device frame-rate, startup, memory or battery improvement is claimed.

Validation completed:

- All 22 Debug native checks pass on iPhone 17e / iOS 26.5 (17 unit, five UI). New coverage includes geographic bounds/date-line edges, area versus full-list membership, a saved place outside the map area, empty-area recovery, and expanded search with an on-screen software keyboard in dark appearance at accessibility size 1. Existing serving/litre, catalog/cache and A/B/C navigation checks still pass. Results: `artifacts/ios-map-context-final.xcresult`.
- Regular Release simulator build passes with strict concurrency and no warnings. A focused optimized Release UI test also passes: opening/closing the Hospitāļu Ezītis pin retains its screen position within two points. This test build uses `ENABLE_TESTABILITY=YES` because the project also compiles its `@testable` unit target. Results: `artifacts/ios-release-pin-context.xcresult`; inspected before/after screenshots are under `artifacts/map-pin-review/`.
- Rendered review covers the loaded native map, compact/full/saved/empty panels, keyboard, wrapping venue name and serving metadata, light appearance, and dark appearance with large text on the smaller phone. The keyboard capture is under `artifacts/map-context-review/`; the settled light draft is `artifacts/map-area-final.jpg`. Native/browser frames and test attachments supply UI evidence; a passing build alone is not the design gate.
- `git diff --check` and bundled catalog equality pass: 165 venues / 2,550 servings, still researched on 4 September. No catalog data or website source was changed.

A remains **provisional**, with B/C available. These drafts remain excluded from Release; the Release UI change is camera-context preservation. The background mirror was restored after interruption and is now pinned to iPhone 17e at http://localhost:3201/ in terminal session 45074. The five-hour heartbeat keeps its existing cadence and quiet intent. No website deployment, push, physical-iPhone installation or App Store release occurred. Pre-existing `research/` stays outside the commit.

## Native menu clarity and measured update cost — 2 October 2026

The provisional shared detail now groups exact beer names above their real serving sizes and aligned prices, moves collapsed provenance beside the selected quote, removes the duplicate map/category heading, and preserves one walking action. Every serving, including duplicate entries, unknown sizes, multipacks and starting prices, remains present. Source and hours links retain separate provenance. The reference principle and provisional status are recorded in `docs/design-direction.md`; A/B/C remain available and excluded from Release.

Both production and draft menus reuse one prepared venue/sort presentation with stable source-ordinal row IDs. Catalog acceptance and changed menu content invalidate it; browsing/source updates reuse its prepared labels. This adds no catalog-wide startup preparation. The production detail's visual layout is preserved.

Validation completed:

- All 27 native correctness checks pass (20 unit, seven UI) on iPhone 17e / iOS 26.5; the opt-in Release performance test skips in ordinary runs. Coverage includes the complete catalog/grouping/row identities, cached menu lifecycle, source disclosure, actual large-text scaling, and existing map/search/save/cache flows. Results: `artifacts/menu-refinement/debug-all-verified.xcresult`.
- The exact source/menu interaction passes in light appearance and in dark appearance with accessibility size 1 on iPhone 17e / iOS 26.5. Actual rendered review exposed a sheet that ignored the study's large-text override; it is now explicit on detail/filter sheets, with a check for actual text scaling. Expanded source captures wait for settled layout. Inspected final images are under `artifacts/menu-refinement/final-test-attachments/`.
- Optimized Release before/after measurements use the actual 73-row ALA menu and repeated source disclosure updates. Mean CPU/clock changes are small and inconclusive; measured peak process memory rises from 108.44 to 113.71 MB. The optimized model workload confirms lower repeated sorting/formatting work, with identical checksums. These are simulator/Mac observations, not physical-device speed or memory claims. Reproduction and full limitations: `docs/performance.md`.
- Regular Release simulator build passes with strict Swift concurrency. Catalog snapshot equality and `git diff --check` pass: 165 venues / 2,550 servings, still researched on 4 September.

This is locally verified, provisional native work. No website deployment, push, physical-iPhone installation or App Store release occurred. The five-hour continuation keeps its existing cadence and quiet background intent; no prompt change was necessary. Pre-existing `research/` stays outside the scoped commit.

## Native map hierarchy and retained annotations — 3 October 2026

The provisional map now gives individual serving prices stronger contrast and uses neutral readable cluster circles. Selection and retained appearance colors stay coherent; annotations are clipped to the actual map bounds. Fresh published-screen research and Apple's map guidance informed the hierarchy; see `docs/design-direction.md`. A/B/C remain available and unapproved. The Release palette is preserved.

A source-coordinate refresh now moves the existing native annotation instead of leaving its pin at the old location. Repeated unchanged coordinates emit no KVO notifications, and price labels still configure only when displayed inputs change. Source/menu/serving semantics and geographic-area publication remain intact.

Validation completed:

- All 31 Debug native correctness checks pass (23 unit, eight UI), with the two opt-in performance checks skipped during ordinary runs. New checks cover source-coordinate movement/KVO suppression, retained light/dark cluster borders and exact multipack/from/unknown-volume marker labels. Existing search/save/cache/menu/map flows still pass. Result: `artifacts/map-hierarchy/debug-all-verified.xcresult`.
- Inspected the final loaded light map, clustered-to-zoomed region, a single real venue pin and camera preservation through detail/appearance changes, and the dark accessibility-size-1 overview/place panel on iPhone 17e / iOS 26.5. Proof: `artifacts/map-hierarchy/final-ui-attachments/`. No user design approval is inferred.
- Regular optimized Release simulator build passes with Swift 6 complete concurrency checking and no warnings. Before/after Release map interactions also pass; production palette and serving labels remain intact. Clock/CPU ranges overlap, and tile/cache/memory variation prevents an app-wide speed or memory improvement claim.
- The opt-in production-map pan/zoom workload passes before/after with raw CPU, clock and memory samples and repeatable commands in `docs/performance.md`. It includes live MapKit/cache work and automation, and does not measure physical-device frame delivery or the DEBUG-only draft palette.
- Bundled catalog equality and `git diff --check` pass: 165 venues / 2,550 servings, researched on 4 September. No web source or venue data changed.

This is locally verified, provisional native work. No push, website deployment, physical-iPhone installation or App Store release occurred. The five-hour cadence and quiet background intent remain unchanged; the existing prompt reads these revised priorities, so no schedule revision was necessary. Pre-existing `research/` stays outside the scoped commit.

## Next work

The first functional milestone is complete; visual design remains provisional. Prioritize the native redesign:

1. Continue reviewing dense zoom levels and the map-to-place journey. Draft A's price/cluster hierarchy, detail/menu/source grouping, visible-area/list coordination and accessible row/keyboard layout are implemented and locally checked. Continue independently with the provisional recommendation; don't equate it with user approval. Keep B/C available for comparison until reviewed, then remove losing drafts and implement the reviewed direction properly.
2. Fix the existing Release overview badge covering Apple Maps attribution, verified in the Release workload capture, and review the original product's denied-location state and remaining large-menu/maximum-text extremes. The study's long-title, exact-price, grouped-menu and source layout now have actual accessibility-size-1 sheet coverage. Keep smaller-screen, dark, accessibility, keyboard and empty/saved checks as layout gates. Fix observed defects before expanding scope.
3. Measure useful startup and representative scrolling/search/map interactions with production browser and native Release traces. Conditional refresh and off-actor remote preparation are complete; profile remaining synchronous startup decode/index work, marker work, memory and idle costs. See `docs/performance.md`; do not turn microbenchmarks into device speed claims.
4. Apply useful, visually coherent website parity: saved places and exact serving-size filters, within the startup and interaction budgets.
5. Improve source freshness per venue with actual menu evidence and distinct dates, and investigate the web map's dense overview with rendered/performance evidence.
6. Prepare TestFlight when authorized signing/distribution access is available.

Keep the five-hour continuation active. Work quietly while nothing meaningful changes; report verified milestones, concrete failures, or required user action. Preserve unrelated changes and commit completed slices.
