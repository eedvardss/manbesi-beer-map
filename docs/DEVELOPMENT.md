# Beer Map development log

## Direction

Keep the web project available for development; Aluskarte is intentionally blank at the user's request. Preserve sourced prices and clear serving comparisons. The user removed the five-hour continuation; it must remain deleted unless explicitly requested again. Earlier automation references below are historical.

## User price suggestions — 9 October 2026

Implemented on `feature/price-reports` from the restructured `main`. Users submit
price suggestions for identified beer servings; PostgreSQL stores pending reports,
approved overrides, append-only approval/reversal history and shared quotas.
An authenticated reviewer checks the source before publishing. Accepted prices
flow through the API to map markers, filters and litre comparisons without a
rebuild. Repeated setup preserves reports and overrides. Runtime connections use
restricted app/reviewer roles; setup alone uses the database owner.

Added the opt-in `infrastructure/compose.prices.yaml` and browser scenarios in
`playwright/price-suggestions.mjs`. Setup and limits are documented in
[price-suggestions.md](price-suggestions.md). Verified real SQL transactions,
competing approvals, retries, chained reversals and role restrictions; real
desktop/mobile submission/review flows; existing browser regression; lint/types,
data audit and both build targets. Local preview uses a separate project on port
3010 and a disposable database. No pipeline edits or public/cloud deployment.

## Monorepo layout — 9 October 2026

Restructured the repository at the user's request. The web app (source, scripts, package files, Vite/Next/TypeScript/Wrangler configuration and `.env.example`) moved to `application/` with `git mv`. `Dockerfile`, `compose.yaml` and `Dockerfile.dockerignore` moved to `infrastructure/`; Compose builds from `../application` and reads `infrastructure/.env`. `playwright/` is an empty placeholder; the browser test stays in `application/scripts/`. This log moved to `docs/DEVELOPMENT.md`. CI runs npm in `application/` and Compose with `-f ../infrastructure/compose.yaml`. Run npm commands from `application/`; paths in the dated entries below are relative to it. No deployment occurred.

## Native iPhone app removed — 9 October 2026

Removed the native iPhone app (`ios/`), its Swift benchmarks, project/icon generators, design preview and bundled-snapshot sync at the user's request. The container check now compares `/api/venues` with `app/catalog.ts`. Native references in the dated entries below are historical. No deployment occurred.

## API frontend and Docker optimization — 8 October 2026

Connected the website to `/api/venues` for all venues, servings, source data
and opening hours. The Docker flow is now frontend → REST API → PostgreSQL.
Initial loading/error/retry and refresh status are explicit. Refresh retains
filters, selection and map instance; 304 retains indexes and marker DOM.
Venue data is absent from the client bundle. Added a direct-update revision
trigger and bounded server snapshot cache; health checks no longer fetch the
document. Docker uses production dependencies and compiled database scripts,
and serves precompressed assets. Research files remain the seed source.

Measured image size 1.42 GB → 0.90 GB and page hydration JS 903,832 → 230,097
raw bytes / 211,999 → 77,714 gzip bytes. Actual Chrome receives a 73,770-byte
Brotli page chunk plus the compressed API catalog. Detailed workload and limits
are in `docs/performance.md`. Tightened the page budget to 300 KB raw / 100 KB
gzip. Added browser checks to Docker CI; remote CI has not run yet.

Verified 19 tests, lint/types, audits and native snapshot equality; Node/Docker
and Cloudflare builds; real PostgreSQL tests; healthy actual containers and
compressed asset/API checks; loading/503/retry and refresh preservation; and
the full existing desktop/mobile interaction regression through Playwright CLI.
Its expanded-marker toggle now uses keyboard activation because the detail
header can cover that price button on mobile. Rendered review includes mobile
error state and actual map/details with tiles loaded.

A temporary direct database change to venue name, price and
opening hours appears in the frontend on refresh without a build. The original
catalog was restored exactly. Stack remains at http://localhost:3000, branch
`feature/docker-postgres`. No public deployment, push or native installation.

## Docker container startup verified — 8 October 2026

Docker Desktop is now installed and running. Actual `docker compose up
--build -d --wait` passes on Engine 29.8.2 / Compose 5.5.1, Linux amd64 with
Node 22.23.3 and PostgreSQL 17.11. In-image checks/build pass, app and database
are healthy, and setup exits 0. SQL verifies all 165 venues / 2,550 servings
are persisted. The repeatable `scripts/check-container.mjs` verifies HTTP 200
for the page/JS asset, PostgreSQL health, full API equality with the native
catalog snapshot, and conditional 304 responses.

Recreated containers and network while retaining `beer-map_postgres_data`:
catalog checksum and update timestamp are unchanged, the migration is not
reapplied, and setup preserves the existing catalog. App runs as uid 1000.
The stack remains running at http://localhost:3000 with a generated password
in ignored `.env`. This supersedes the missing-Engine limitation below. No
public or Kubernetes deployment, push, or native installation occurred.

## Docker and PostgreSQL support — 8 October 2026

Created `feature/docker-postgres` from `main` at the user's request. Added a
multi-stage Node Dockerfile, Compose app/database/setup services, persistent
PostgreSQL 17 storage, transactional versioned migrations, explicit catalog
seeding and health checks. `DATABASE_URL` enables PostgreSQL for the shared
catalog API; the web client's venue data remains bundled. Startup preserves an
existing database catalog. Missing/unreachable database data returns uncached
503 responses. Setup and scope are documented in `docs/docker-postgres.md`.

Dependency verification initially found an extraneous Sharp WASM package and
missing WASM helper entries in the npm lock graph. A clean install and pinned
EMNAPI helpers now reproduce successfully: `npm ci` and `npm ls --all` pass
with no missing or extraneous packages. The pre-existing local lockfile edit
was preserved; its starting contents are backed up in ignored artifacts.
The existing iPhone snapshot was semantically identical but had CRLF on
Windows; its check now normalizes line endings without changing catalog data.

Verified on Windows with Node 24.11.0/npm 11.6.1: lint/types, all 16 existing
tests, catalog audits and native snapshot check; Docker-target and Cloudflare
production builds; hydration budget; two integration tests against a temporary
real PostgreSQL 17.10 server; actual production Node HTTP checks for the page,
JS asset, seeded API data, conditional 304 and a live database update. Compose
v5.6.0 validates `compose.yaml`. Added a CI job for PostgreSQL tests and actual
container build/start/API smoke checks.

Docker Engine is absent here, so the container build and startup have not been
executed locally; the added CI job has not been run remotely. No deployment,
push, native installation or App Store release was performed.

## Aluskarte taken offline — 7 October 2026

The user requested removing Beer Map from Aluskarte and leaving nothing there. The public apex and www hostname now return an empty HTML document for every path, including the API and static assets. `run_worker_first` ensures assets cannot bypass that response. Responses are non-cacheable and marked noindex/nofollow/noarchive. Domain registration and the separate legacy manbesi.lv Workers remain intact; source and localhost development are preserved. Do not republish the app on Aluskarte without a new explicit user request.

Production build and checks pass; built configuration confirms Worker `aluskarte`, both custom domains, previews disabled and worker-first assets. Deployed version `e7db742c-21e8-40ed-9b66-c7dcf15d1e76`. Live curl checks confirm HTTP 200 with zero bytes for apex, www, `/api/venues` and the previously published JS asset URL. Browser confirms a completely blank page; proof is `artifacts/aluskarte-blank.png`.

## Individual web markers restored — 7 October 2026

The user rejected grouping. Removed the screen-space grouping algorithm, count markers and co-located chooser; every matching venue now keeps its own price marker at every zoom. Retained unchanged-marker reuse, exact serving/menu data and the mobile selected-panel resize correction. Deleted obsolete grouping unit tests and updated the browser regression script for individual markers.

Validation: production build, lint/type checks, remaining unit/menu/timeline tests, data audit and bundled native snapshot equality pass. Hydration bundle is 903,832 raw / 211,999 gzip bytes, within budget. Actual production-preview browser checks: 165 individual markers and zero groups before/after zoom; two independent Vagonu iela 21 results; full ALA menu with 73 servings; 390 × 844 and 320 × 568 Chrome viewports keep selected menu/footer visible after resizing. No Chrome console errors. In-app browser viewport screenshots were unreliable, so mobile visual review used Chrome. The checked-in browser script was updated; this run exercised the focused interactions through CUA, not the full standalone script.

This restores denser overlapping labels by request; no claim of improved runtime or memory performance is made. Impeccable detector reports only the two pre-existing line-112 hover-glider motion findings (bounce easing and height transition); both left unchanged and unsuppressed outside this scoped reversal. Native clustering is unchanged. Published to Worker `aluskarte`, version `0ed744e1-49ef-4479-bb35-b9a3bf89c8a3`, on apex and www. Live browser confirms 165 individual markers, zero groups and the selected ALA full menu. Apex API and www root both return 200. Proof: ignored `artifacts/individual-markers-live.jpg`.

## Domain launch — 7 October 2026

Published the current Beer Map to **https://aluskarte.lv/** and **https://www.aluskarte.lv/** using the dedicated Cloudflare Worker `aluskarte`, final version `1fc2d939-10fe-4a1b-83c8-0ae0ab52b2f9`. NIC registration remains in place; its nameservers are `dahlia.ns.cloudflare.com` and `jason.ns.cloudflare.com`. Cloudflare uses the free zone plan, managed certificates and HTTP-to-HTTPS redirects. The domain is paid until 7 October 2027. No new paid hosting, account or automation was created.

Public metadata and native API/share/about links now use Aluskarte. Native parsing retains old venue links for compatibility. The separate legacy Workers and their service binding were left intact: manbesi.lv `/` and `/alus` return 200, `/p2p/` 302, `/api/status` 200. These independent services are not exposed on Aluskarte; its `/p2p/` normalizes to a 404 and `/api/status` returns 404.

Privacy: account-named workers.dev and version-preview URLs are disabled and verified through the API. Client source maps are disabled. The final live HTML, catalog, and all 14 served build assets have no matches for the owner's identifying names/handles, local filesystem paths, source-map directives or legacy personal-domain links. Assets match the local build byte-for-byte; the generated `_headers` control file is correctly inaccessible. `.git/config`, `.env`, README and AGENTS all return 404. Public WHOIS after delegation shows natural-person status and NIC's contact form, without name, email, phone or street address. Registrar/provider records and historical correlations still exist: this is verified public-exposure reduction, not an anonymity guarantee.

The Worker preserves no-referrer, CSP, permissions, nosniff and frame-protection response headers. Headers are applied after rendering because the installed framework's config-only headers did not reach cached page responses in the local check. Final page, API and error responses were verified. No venue data or source dates changed.

Validation: production build, lint/types, 21 web unit/API/recovery/layout checks, data audits and native snapshot equality pass; hydration budget remains 909,123 raw / 213,492 gzip bytes. Wrangler types and final dry run pass. All 31 native unit tests pass on iPhone 17 Pro / iOS 26.5. This changes native source only; no physical-phone installation or App Store release occurred, and native design remains provisional.

Live HTTPS returns 200 on apex and www; HTTP redirects retain venue queries. The live catalog exactly matches the native snapshot (165 venues / 2,550 servings), and its ETag returns 304 with zero body bytes. The actual browser loads map tiles, grouped markers and ALA's full menu with source/direction links and copying confirmation; no console errors were observed. A 390 × 844 emulation reports the correct CSS viewport, but capture scaling/cropping is inconsistent, so it does not establish a fresh mobile visual pass. Desktop proof and raw public checks are in ignored `artifacts/domain-migration/`. Temporary browser emulation is cleared. DNS initially lagged in this Mac's negative cache; normal apex and www lookups now work. No new performance or design-quality claim is made.

## Functional baseline — 2 October 2026

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

## Native map attribution and text layout — 3 October 2026

Corrected the existing product map's overview badge covering Apple Maps attribution. The map now ends above a separate, flat status/location row, with its legal link and logo visible inside the canvas. Passive status no longer has a glass card. Quick filters use their content height rather than a fixed 44-point crop, so larger text remains readable and the horizontally scrolling controls stay usable. This is a scoped correction to the functional baseline; the complete visual direction remains unapproved and A/B/C remain available as provisional DEBUG drafts.

Validation completed:

- Debug build and all 34 native correctness checks pass (23 unit, 11 UI); two opt-in performance checks skip during ordinary runs. Existing exact-serving/search/save/cache/menu flows and pin detail camera continuity still pass. Result: `artifacts/map-attribution/debug-all.xcresult`.
- Regular optimized Release build passes with strict concurrency and no warnings. Six final Release UI checks pass: map layout in light, dark and the largest accessibility category, plus the existing pin/detail, list/save/filter and litre/empty-search flows. Result: `artifacts/map-attribution/release-product-final.xcresult`.
- Inspected loaded native light/dark screens on the smaller iPhone 17e / iOS 26.5 (390 × 844 points), including the largest accessibility text and a real horizontal-filter interaction selecting exact 500 ml (165 → 131 places). Status text wraps, location stays clear of the tab bar, and attribution stays above the status row. Font height is verified to increase rather than assuming a launch argument worked. Final images/geometry: `artifacts/map-attribution/final-release-attachments/`.
- Actual canvas height is 454 points at ordinary text and 236.3 points at the largest category with the offline catalog. This trades some map area for unobscured attribution and legible status. Online captions, denied-location messages, largest-text menus/list rows and keyboard extremes need their own review; this does not establish those states or physical-device performance.
- Catalog snapshot equality and `git diff --check` pass: 165 venues / 2,550 servings, still researched on 4 September. No venue-price research or web source changed.

Appearance overrides are isolated to UI-test launches and leave normal launches following the system. The correction adds no interaction-time geometry observer, timer, marker rebuilding or network work. No timing, frame-rate, memory or battery improvement is claimed. No push, website deployment, physical-device installation or App Store release occurred. The five-hour continuation keeps its existing cadence and quiet intent; pre-existing `research/` remains outside the commit.

## Native location access and contextual recovery — 3 October 2026

Corrected an unsolicited location warning that reappeared after denial on every launch and left only 24 points of map at maximum text. Denying the real system prompt now returns to a useful, quiet map. A later location request offers concise recovery in the initiating control, including the filter sheet, without repeating warnings across tabs. Initial alert text also overflowed at maximum text; shorter copy now fits above the actions. The functional correction is locally verified; the complete visual direction and A/B/C remain unapproved.

The one-shot provider now tracks authorization versus an active position request, ignores duplicate taps/callbacks, clears coordinates after denied/restricted revocation and separates restricted access from transient failures. Request-owned feedback prevents two presenters and protects a new issue from stale alert dismissal. The system boundary permits repeatable checks without real position access. There are no new location streams or polling.

Validation completed:

- All 45 Debug native correctness checks pass (31 unit, 14 UI), with two opt-in performance checks skipped and zero failures. The MCP response timed out at 300 seconds, but the underlying Xcode run completed successfully; the finished result bundle and build log confirm the counts. Result: `artifacts/location-access/debug-all-final.xcresult`.
- The regular optimized Release build passes in Swift 6 with the project's complete-concurrency configuration. All 40 scoped Release checks pass (31 unit, nine product UI), including existing cache/menu/serving/save/search and pin/detail camera behavior. Test builds use `ENABLE_TESTABILITY=YES`; optimization remains `-O`. Result: `artifacts/location-access/release-product-final.xcresult`.
- Actual rendered review covers the real permission denial, quiet cold relaunch, concise recovery in light/dark and the largest accessibility category, cancellation without moving the map, and a single alert on the active filter sheet. Final Release map bounds are 390 × 454 points at ordinary text and 390 × 236.3 at maximum text. Attribution remains inside the map. Horizontal exact-500-ml filtering still produces 131 of 165 places. Images and geometry: `artifacts/location-access/final-release-attachments/`.
- Settings launch passes, but the supported URL repeatedly lands at the iOS 26.5 Simulator's Settings root. App-specific navigation and permission recovery are not verified. Direct UIKit opening, ad hoc Simulator signing and a temporary Settings bundle did not resolve it; the bundle is removed. Keep this as a physical-device validation gate, rather than repeatedly changing supported URLs to satisfy the Simulator. See `docs/design-direction.md`.
- Eight model checks cover request deduplication, system denial, restricted access, transient retry, revoked authorization, empty fixes and stale-feedback dismissal. Restricted/services-unavailable/retry UI still needs rendered/device coverage. No device latency, frame-rate or battery improvement is claimed; see `docs/performance.md`.
- Catalog equality passes with `node --import tsx scripts/sync-ios-catalog.ts --check`: 165 venues / 2,550 servings, researched on 4 September. The npm/tsx CLI wrapper was blocked from creating its sandbox IPC socket; the same check script ran directly. No venue data or web source changed.

This is local native work. No push, website deployment, physical-iPhone installation or App Store release occurred. The five-hour cadence and quiet notification intent remain unchanged; the existing task reads these revised priorities, so no prompt revision was needed. Pre-existing `research/` remains outside the scoped commit.

## Native serving layout at maximum text — 3 October 2026

Fixed the observed split menu headings, narrow serving columns, oversized directions controls and unscaled product quote. Accessible text now gets full-width values and stacked actions/headings; product detail opens at full height. Ordinary text retains compact columns. The count describes published portions and the new shared values view consumes the prepared exact labels. The DEBUG draft now has an explicit maximum-text review mode. The complete native visual direction and A/B/C remain unapproved.

Validation completed:

- 44 scoped Debug checks pass (31 model, 13 UI), zero failures. The existing model/search/save/filter/litre/menu/source/draft/map-context checks and five new detail checks pass in sequential runs: `artifacts/detail-accessibility/debug-regression.xcresult` and `debug-detail-final.xcresult`.
- The regular optimized Release build passes with Swift 6 complete-concurrency configuration and no warnings. 44 Release model/product checks pass (31 model, 13 UI), zero failures, in sequential runs: `artifacts/detail-accessibility/release-values.xcresult` and `release-navigation.xcresult`. Existing attribution, exact filters, saved/search/litre/empty states, pin/detail camera continuity and location-denial/recovery checks pass. Settings launch remains distinct from app-specific permission recovery on a physical device.
- Inspected real rendered smaller-screen light/dark detail and menus at ordinary, accessibility-size-1 and maximum text. New checks verify actual font growth, one-line headings, full-width exact values, expanded/collapsed sources and return to the same filtered venue. ALA retains all 73 servings; 3000 ml / 18.90 EUR, 6 × 330 ml / 22.50 EUR and unknown-volume labels remain exact. The unknown volume receives no inferred litre price. Final screenshots/geometry: `artifacts/detail-accessibility/final-debug-attachments/`, `draft-regression-attachments/` and `final-release-attachments/`.
- Catalog equality passes: 165 venues / 2,550 servings, researched on 4 September. No venue data or web source changed. This is a layout correction; no timing, frame-rate, memory or battery improvement is claimed. See `docs/performance.md`.

No push, website deployment, physical-iPhone installation or App Store release occurred. Physical-device Settings recovery remains a separate gate. The five-hour cadence and quiet notification intent are unchanged; the existing task reads these revised priorities. Pre-existing `research/` remains outside the scoped work.

## Native overview, search and list accessibility — 3 October 2026

Fixed maximum-text layout defects reproduced in the product and all three provisional drafts: long names were squeezed beside prices, controls grew into the search field, and keyboard/chrome could leave no useful result viewport. Rows now put exact serving values below full-width identity at accessibility sizes; ordinary text retains its compact price column. Bookmark glyphs stay bounded inside a complete 44-point target. The product removes the repeated offline banner, keeps the date in the list footer/detail/source context and prioritizes visible search results while the keyboard is active. Filters remain available from the toolbar.

Draft A preserves a readable map and native attribution while its accessible list is expanded. B gives search results priority over the editorial feature and masks scrolling content below the status bar. C keeps the full comparison labels horizontally scrollable, shows the units with each accessible quote and clips results below the controls. The review switcher returns when editing finishes. These are corrections to the existing structurally distinct drafts; their full visual direction remains provisional and unapproved.

Validation completed:

- 45 distinct scoped Debug checks pass (31 model, 14 UI), zero failures, across `debug-overview.xcresult` and `debug-navigation.xcresult`. Existing search/filter/litre/empty/save, draft switching, area/all-places coordination, camera return and maximum-text menu/source checks remain intact. The draft maximum-text interaction check was rerun after the final clipping/clearance correction; `final-draft.xcresult` and its attachments are the authoritative final draft proof.
- The regular optimized Release build passes without warnings. All 13 scoped product UI checks pass, zero failures: new list/keyboard/unknown-volume/multipack checks plus ordinary and maximum-text detail, saved/search/filter/litre/empty states, map attribution and pin/detail camera continuity. Proof: `artifacts/overview-accessibility/release-product.xcresult`. Release testability is enabled only for the test invocation; optimization remains enabled.
- Inspected actual ordinary-light and maximum-text light/dark screens on iPhone 17e / iOS 26.5 Simulator, 390 × 844 points. Checks tap a visible result above the keyboard, return to the retained query, scroll complete quotes above bottom controls, select per-litre mode and save by tapping beside the small glyph within its 44-point target. Exact values include Tallink 500 ml / 6.00 EUR / 12.00 EUR per litre, The Snuggest's unknown size / 5.00 EUR and Cabo's 6 × 330 ml / 22.50 EUR. Geometry is checked against the actual viewport, including the predictive keyboard bar; a retained offscreen keyboard node does not count as visible.
- Baseline and final screenshots/geometry are under `artifacts/overview-accessibility/`. A's map with the keyboard grows from 79 to 161.7 points; its long result name uses 283.3 rather than 137.7 points of width. The product's long name uses 268.3 rather than 147.3 points. These are layout bounds, not performance timings. Catalog equality still passes for 165 venues / 2,550 servings, researched on 4 September. No catalog or web code changed.

The next bounded priority is Release useful-startup profiling. Maximum-text draft A still needs a separate map-overlay/camera composition review: its filtered pin can sit partly beneath the floating search field. Dense zoom, restricted/retry recovery and physical-device Settings destination remain separate gates. Physical rendering and live VoiceOver are unverified. This local native slice includes no push, deployment, device installation or App Store release. The existing five-hour cadence and quiet intent are unchanged; no schedule revision was necessary. Pre-existing `research/` stays outside the commit.

## Native warm launch baseline — 4 October 2026

Added opt-in Release launch checks using the real bundled catalog. They record first-frame and responsive-frame endpoints and separately require map overview, the exact 165-place count and a price annotation. This establishes a repeatable baseline, not a runtime optimization or a time-to-painted-prices measurement. Product source and the provisional A/B/C direction are unchanged.

Validation completed:

- Both optimized Release launch checks pass, with five reported samples each on iPhone 17e / iOS 26.5 Simulator, 390 × 844 points, hosted by the arm64 Mac / macOS 26.5.1. Median first frame is 0.915 s; median responsive frame is 1.034 s. Warm OS/filesystem and uncontrolled MapKit tile/cache state limit the conclusion. Raw samples and repeatable commands are in `docs/performance.md`; final result: `artifacts/launch-performance/release-launch.xcresult`.
- An ordinary focused test invocation skips both new checks with zero failures, confirming the explicit opt-in gate. Product bookmarks/cache are isolated and venue API refresh is disabled during this bundled workload. No broad correctness rerun was needed because production source is unchanged.
- A temporary five-launch wall-time probe measured store construction at median 13.585 ms and location-provider construction at 0.687 ms. It is not CPU attribution and excludes later rendering/callbacks. The probe and initializer wrappers are removed; the final standard optimized Release build passes without Swift warnings. Its loaded price map and clear native attribution were inspected. Patch/helper/logs remain only in ignored proof.
- Installed App Launch and Time Profiler attempts stalled before recording; no usable CPU trace exists. Developer mode reports disabled, without proving that configuration caused the stalls. No global security setting changed. Preserve immediate offline content; the current evidence does not justify rewriting startup around an assumed decoding bottleneck.
- Bundled equality and `git diff --check` pass: 165 venues / 2,550 servings, still researched on 4 September. No prices or web source changed. Physical-device cold/cached startup, useful-content timing, CPU/frame/battery profiling and live VoiceOver remain separate gates.

This local measurement slice includes no push, deployment, physical-iPhone installation or App Store release. The complete native visual direction remains unapproved. Next bounded work returns to the known maximum-text draft A map-overlay issue and production-browser profiling; resume native CPU tracing when access is available rather than repeating stalled captures. The five-hour cadence and quiet notification intent are unchanged; the task already reads these priorities. Pre-existing `research/` remains outside the scoped commit.

## Draft map search and visible prices — 4 October 2026

Corrected the known filtered-pin overlap in provisional draft A. At accessibility sizes, search now has its own solid band above the retained map; ordinary text keeps the compact floating control. The bounded, scrollable panel reserves space for native attribution and a complete map price. The accessible summary shows “500 ml” while its spoken label retains the exact-filter wording. A/B/C remain DEBUG-only and unapproved; this does not promote a draft into Release.

Validation completed:

- Reproduced the original defect on iPhone 17e / iOS 26.5 Simulator, 390 × 844 points: the real Tallink price partly intersected the maximum-text search field with the keyboard and expanded list. The new focused baseline test failed; screenshots and geometry confirm the overlap. The stored baseline also includes an initial test-only currency whitespace mismatch, corrected without changing data.
- All 11 distinct scoped Debug UI checks pass, zero failures: four new filtered-price cases (maximum light/dark, accessibility size 1 dark and ordinary light), two existing A/B/C layout checks and five existing navigation/menu/map-context checks. They verify the real 500 ml / 6.00 EUR pin is fully inside the map, clear of search and attribution, tappable, and retained within two points after detail return. Search, saved/area/all-places coordination, full menus, sources and variant/appearance switching remain intact. Final results: `artifacts/map-search-layout/debug-layout.xcresult` and `debug-navigation.xcresult`.
- The regular optimized Release build passes without Swift warnings; its loaded ordinary-light price map was inspected. All four final Release UI checks pass: maximum-text map/attribution and exact-500-ml selection, pin/detail camera return, maximum-text unknown-size search/detail/save and exact multipack layout. `ENABLE_TESTABILITY=YES` is limited to test invocation; optimization stays enabled. Final result: `artifacts/map-search-layout/release-product-final.xcresult`.
- Inspected final rendered light/dark, ordinary/accessibility-size-1/maximum-text search, keyboard, expanded map and complete scrollable quote states. At maximum text the unobscured map is 128.3 points high with the keyboard and 167.7 points with the expanded list. Its price is clear of both search and native attribution. These are layout bounds, not speed measurements; research/application and the space tradeoff are in `docs/design-direction.md`.
- Corrected two automation assumptions exposed by the smaller viewport: a slow drag with a brief hold avoids inertial overshoot, and product-list viewport calculations exclude the actual pinned section heading before testing the full bookmark target. Existing visibility/price assertions retain their margins. Earlier failed attempts are preserved separately; neither correction changes product scrolling or bookmark code.
- Catalog equality and `git diff --check` pass: 165 venues / 2,550 servings, still researched on 4 September. No model, published price, web source or Release product layout changed. No latency, frame-rate, memory or battery improvement is claimed.

This closes the previously recorded draft A search-overlay defect. Dense maximum-text geographic context, physical-device rendering and live VoiceOver remain review gates. Next bounded work is production-browser useful-content and interaction profiling. This local slice includes no push, deployment, physical-device installation or App Store release. The existing five-hour schedule and quiet intent are unchanged; its prompt already reads these priorities. Pre-existing `research/` stays outside the scoped commit.

## Production browser measurement and unchanged results — 4 October 2026

Measured the built website in a background Chromium 154 browser at 390 × 844 CSS pixels, CPU4×, 3 Mbps download / 1 Mbps upload / 150 ms latency, with HTTP cache bypassed. An opt-in loopback wrapper supplies early startup observation without changing shipped bundles. The new indexed query retains one result per source venue when its winning quote and complete menu remain unchanged, allowing existing memoized rows and markers to skip repeated work. The website composition is retained; native A/B/C and the complete native direction remain unapproved.

Validation completed:

- Baseline and final `npm run build` pass. The final required checks include lint/types, all **13** serving/API unit checks, the existing full-menu/price/timeline/data audits and iOS snapshot equality for **165 venues / 2,550 servings**, still researched on 4 September. The initial-page budget passes at **901,710 raw / 211,238 gzip bytes**. The two added query checks cover retained identity and invalidation when a menu narrows without changing its cheapest price; existing reference comparisons cover 96 query/band/sort combinations.
- Three unprofiled trusted `ipa`/clear cycles before and after preserve counts **165 → 68 → 62 → 165**. Median input-to-second-rAF opportunity for `i` is **39.5 → 17.8 ms**; `ip` **83.1 → 74.9 ms**, `ipa` **46.1 → 38.1 ms**, clear **80.5 → 70.8 ms**. The unchanged-result step preserves **164 of 165 marker text nodes**, compared with zero before. Small samples and host/emulation/probe limits prevent an app-wide speed or field-INP claim. Raw samples and repeatable commands are in `docs/performance.md`.
- Three unprofiled startup samples have median FCP **984 ms** and priced DOM/frame opportunity **4,319.7 ms**. A main-thread CPU trace is stored separately; its mostly idle time excludes worker/GPU costs. This change establishes no startup improvement. The local wrapper buffers/recompresses HTML and injects 5,895 raw bytes; a later diagnostic heading correction adds nine bytes for final proof/recheck. A separate final-build three-cycle search recheck retains the result counts and has medians **16.3 / 70.7 / 36.4 / 75.0 ms**. Real-device/cold-CDN latency remains unverified. Map startup exceeds the provisional 3 s investigation target.
- Inspected loaded and settled selected-place mobile/desktop states. ALA retains all **73** servings, its **3000 ml / 18.90 EUR / 6.30 EUR per litre** quote, and its source. Changing to the filtered **500 ml Hazy IPA / 5.50 EUR** menu produces one correct row. Swings retains unknown volume without an inferred litre price. Enter expansion/collapse preserves the original desktop marker button and keyboard focus. A settled mobile timeline key advances **1395 → 1410**. Complete final review JPEGs from CUA, geometry, raw reports and CPU samples are under `artifacts/browser-performance/2026-10-04/`. Initially cropped CDP PNGs and transient animation/resize captures are superseded by `mobile-reselection-after.jpg` and `desktop-proof-final.jpg`.
- Final screen review reproduced repeated mobile selection moving source links behind the bottom results control. The camera command now reuses the already-open panel height for its offset. Before, its footer ended at **731 px** against the control's **717 px** top; final and repeated selections end at **592.5 px**, retaining all **73** menu rows. The existing browser scenario now asserts this clearance. Its extended CLI scenario was syntax/lint checked; the equivalent flow passed through CUA on the final production build. The entire standalone browser suite was not run.
- One dense-map zoom/pan/return/zoom-out keeps all 165 markers and clear selection state. Four bounded rAF windows have no gaps above 50 ms, with a maximum of 42.4 ms. These are scheduling opportunities on the host, not displayed frames or a measured pan speedup. The overview still visibly overlaps; no broader visual milestone is claimed.
- Diagnostic syntax/lint and `git diff --check` pass. Temporary emulation is restored, owned browser tabs and both loopback servers are closed. The first new identity test exposed a faulty assumption that matching every venue implied matching every menu; the corrected test preserves the menu boundary. Intermediate moving camera/timeline captures are distinct from final settled proof.

This is validated local web work. No push, production deployment, physical-iPhone installation or App Store release occurred. No prices, source dates or native source changed. The existing five-hour cadence and quiet notification intent are unchanged; its prompt already reads these revised priorities, so no schedule revision was needed. Pre-existing `research/` remains outside the scoped commit.

## Early web prices, recovery and smaller screens — 5 October 2026

Removed the unnecessary basemap-loading dependency from price pins and venue menus. They now attach once MapLibre supplies its transform; a restrained caption keeps background loading explicit. Permalinks and queued choices initialize the camera at the venue. Exact servings, source links, the shared catalog and the accepted web composition are preserved. No native source changed; its complete design and A/B/C remain provisional.

Matching production browser runs at **390 × 844 / DPR1 / CPU4× / 3 Mbps down / 1 Mbps up / 150 ms latency / cache bypass**, on the arm64 Mac/macOS26.5.1/Chromium154, show median overview price DOM/second-rAF opportunity **4,157.2 → 2,696.9 ms**, and linked ALA full-menu/footer availability **4,186.3 → 2,704.4 ms**, three unprofiled navigations per route/source. Prices and menus attach about **35% earlier** in this host workload. The basemap endpoint is **4,302.6 / 4,268.5 ms**; it did not improve. Initial control DOM availability is about **132–147 ms later** and FCP is slightly later, with cause unisolated. This is not physical-device speed, delivered-frame, memory or battery proof. A separate final-source sanity run after the failed-write guard retains 165 prices/73 rows at **2,714.9 ms**, with loading completion at **4,269 ms**; final-source recovery preserves the chosen **270 minutes** and Swings filters/menu. Full samples, probe limitations and profiling priorities are in `docs/performance.md`.

The controlled failure test also reproduced an existing Retry defect caused by reusing a failed dynamic import. Explicit Retry now reloads once and carries a short-lived, one-shot context. It retains the latest venue rather than returning to the original link, plus search, band, sort and custom time. A blocked retry stays stable; after unblocking, Swings opens with one unknown-volume marker, nine under5 menu entries and the chosen time. The context/URL flag are consumed; an ordinary reload restores default filters, live time and ten menu entries. A failed storage write cannot revive older context. No automatic reload or query-history cache was added. Failure-button contrast is corrected.

Smaller-screen review reproduced ALA's source footer behind the floating control at **320 × 568**. The camera now measures the map/control bounds only on selection. Final and repeated selection retain all 73 rows at x47/y80, with footer bottom**423** versus control top**441**. The 390 × 844 panel stays at x82/y250, clear of controls. Desktop review retains **3000 ml / 18.90 EUR / 6.30 EUR per litre**, source provenance, full-menu scrolling and Enter focus. A separate early-choice flow opens the list and chooses ALA before map construction; the menu is available while the background is still loading. Actual settled/early screenshots and raw reports are under ignored `artifacts/browser-startup/2026-10-05/`.

Validation: the final **production build** and its required lint/types, **16** unit/API/recovery checks, menu/timeline/data audits and iOS snapshot equality pass. Hydration budget is **903,470 raw / 211,922 gzip bytes**, up 1,760 / 684 from baseline and below existing gates. The extended browser scenario has syntax/lint checks; equivalent failure/recovery and smaller/repeated-selection flows passed through CUA. The entire standalone CLI browser suite was not run. Intermediate moving/overlapping captures are retained separately and superseded by completed settled proof. Temporary emulation and owned loopback/tab resources are cleaned up after review.

This is validated local web work. No push, deployment, physical-iPhone installation or App Store release occurred. Data/source dates remain unchanged. The five-hour cadence and quiet notification intent are unchanged; its existing prompt already reads these priorities. Pre-existing `research/` stays outside the scoped commit.

## Web map density and retained menus — 5 October 2026

Replaced crowded, overlapping web price capsules with neutral venue counts. Tapping a count zooms toward its members; at maximum zoom, a compact chooser keeps co-located places reachable with their actual matching beer, serving and price. Individual price colors, exact litre/unknown-volume semantics, complete menus and provenance are preserved. Research refreshed the actual Mapstr published screens and MapLibre's retained HTML-marker example; the useful principle and product-specific application are in `docs/design-direction.md`. Native source and the provisional, unapproved A/B/C directions are unchanged.

The screen-space layout uses actual capsule dimensions, deterministic membership and weighted centroids. It runs after settled zoom, resize, filter/selection changes and focus leaving a collapsed price. Panning translates retained markers without regrouping. Selected/focused places stay individually reachable; count-to-price navigation transfers keyboard focus, Escape restores the count, and leaving a collapsed price restores its group. Visited price buttons are retained within the current catalog, full menus are removed when detached, and old group memberships are deleted. The map remains north-up and flat; keyboard pan/zoom still work.

Validation completed:

- Matching production browser runs at **390 × 844 / DPR1 / CPU4× / 3 Mbps down / 1 Mbps up / 150 ms latency / cache bypass** on arm64 Mac/macOS26.5.1/Chromium154 reduce attached markers **165 → 66**, in-view labels **102 → 13**, and intersecting label pairs **662 → 0** in the settled overview. All **165** venues remain represented exactly once. Selected/focused exceptions are contextual, rather than covered by the unselected non-overlap assertion.
- Three settled zoom-in/zoom-out/right-pan/left-pan cycles per source reduce median renderer main-thread `TaskDuration` **1,610 → 1,052 ms**, script **705 → 508 ms**, and style **413 → 187 ms**. Cycle wall time **2,368 → 2,384 ms** does not improve. Useful venue representation remains about **2.71 s** over three navigations per source. The comparison includes the focus/blur correction; a later resize-only correction has a separate final-source startup sanity at **2,693.8 ms**. This is host production evidence, not physical-device speed, delivered frames, battery or lower-memory proof. Overview JS heap samples are higher after grouping; the limits and raw labels are in `docs/performance.md`.
- Actual CUA review covers completed phone/desktop maps, trusted zoom and keyboard pan, count-to-member focus, the maximum-zoom **1983 / Nurme** chooser with **330 ml / 2.20 EUR** and **300 ml / 3.90 EUR**, the complete 22-row Nurme menu, Escape, collapse/blur recovery, empty results, ALA's exact **3000 ml / 18.90 EUR / 6.30 EUR per litre** and all 73 rows, and Swings' unknown litre price, ten rows and source link. The site retains its existing dark palette; no native appearance change is inferred.
- A desktop-to-small resize reproduced an open ALA footer at **593 px**, behind the results control at **441 px**. Resize now reuses the existing panel and adjusts its camera offset once. Final **1280 × 900 → 320 × 568** review retains the selected place, all 73 rows and menu scrollTop **3937**, with panel x47/y80 and footer bottom**423**, 18 px clear of the control. Completed proof is under ignored `artifacts/browser-density/2026-10-05/`.
- Final `npm run build` passes lint/types, **21** unit/API/recovery/layout checks, menu/timeline/data audits, iOS snapshot equality (**165 venues / 2,550 servings**) and the output budget. Hydration output is **909,123 raw / 213,493 gzip bytes**, below the existing gates; compared with the rebuilt baseline it adds **5,653 / 1,570 bytes**. The extended CLI browser scenario has syntax/lint validation and equivalent CUA flows; the entire standalone CLI suite was not run. No factual venue data or source dates changed.

This is validated local web work, with a scoped commit. No push, deployment, native device installation or App Store release occurred. Native visual direction remains user-unapproved. Owned diagnostic services, tabs and temporary emulation are cleaned up after review; pre-existing `research/` remains excluded. The five-hour schedule and quiet notification intent are unchanged; its prompt already reads these revised priorities.

## Next work

Prioritize measured responsiveness and rendered review:

1. Keep individual venue price markers at every zoom per the 7 October user request. Do not reintroduce grouping. Preserve serving/source semantics, keyboard focus and selected context; profile future changes on representative browsers before making performance claims.
2. Continue dense zoom and map-to-place review on the website.
3. Apply useful, visually coherent website improvements: saved places and exact serving-size filters, within startup and interaction budgets.
4. Improve source freshness per venue with genuine menu evidence and distinct dates; retained counts and full menus must reflect the same current projection.

The five-hour continuation was removed at the user's request. Do not recreate it. Preserve unrelated changes and commit completed, verified slices when working on a new request.

## PR #1 review follow-up — 8 October 2026

Simplified the app port mapping to `${APP_PORT:-3000}:3000` and documented host-interface access. Moved the one-shot migration/seed command into `scripts/setup-database.sh`, included it in the runtime image, and enforced LF shell-script endings for Windows checkouts. Retained the separate setup service so versioned migrations also run on existing volumes; retained CI PostgreSQL for destructive integration tests, isolated from the Compose/browser catalog. Documented both decisions.

Verified the Docker rebuild (including lint, types, 19 tests, audit and snapshot checks), healthy startup, repeat setup preserving the existing catalog, and container/API/Brotli/304 checks for all 165 venues and 2,550 servings. GitHub CI must pass on the review-fix commit before merging. No public deployment performed.
