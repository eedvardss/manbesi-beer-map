# Performance requirements and evidence

Updated 4 October 2026. The user requires both the website and native iPhone app to feel fast while retaining excellent, clean design. Useful startup, responsive search, smooth lists and map movement, efficient network/cache behavior, and bounded memory/CPU/battery use are standing product requirements. The existing five-hour continuation may be revised independently as evidence changes; keep its cadence and quiet background behavior.

## Measured query and bundle improvements

Reference environment: arm64 Mac, macOS 26.5.1, Node 22.22.3, optimized Swift (`swiftc -O`). The workload uses the real 165-venue / 2,550-serving catalog checked on 4 September 2026. No new menu evidence or prices are implied.

| Measure | Before | After |
| --- | ---: | ---: |
| Website query median | 0.627 ms | 0.063 ms |
| Website query p95 | 0.667 ms | 0.084 ms |
| Native model query median | 1.596 ms | 0.511 ms |
| Native model query p95 | 1.775 ms | 0.619 ms |
| Initial page JS, raw | 1,964,763 bytes | 901,394 bytes |
| Initial page JS, gzip | 494,579 bytes | 211,103 bytes |

Query timings are percentiles of eight-query batch averages, normalized to milliseconds per query. Web: ten warmup batches and 80 measured batches (640 queries). Swift: five warmup batches and 40 measured batches (320 queries). Both cycle through empty search, typing prefixes, IPA, ASCII Latvian search, address search and no matches, with all price bands and price/litre/name sorting. Before/after result checksums match: web `39880.88999999999`, native `22504.380000000005`. Independent correctness tests compare complete web results/menus against the former stable-sort implementation across 96 combinations, and native cached/indexed results against uncached results across filters, sorts, bookmarks, location, clock and catalog refresh.

These results show about 90% less query CPU work on web and 68% less in the native model for this workload. They do **not** measure iPhone launch, frame rate, browser paint, network latency, memory, battery or field responsiveness. Native timing runs the actual model/store on the Mac, not on an iPhone. Cache-hit timing is near timer resolution and is not used for a speedup claim.

MapLibre now loads from a separate runtime chunk after page hydration. The initial page chunk has roughly 57% fewer gzip bytes. The renderer is still downloaded for the map (about 277 KB gzip), with a separate self-contained worker, frameworks, CSS and map tiles. This is a reduction in initial page work, not a 57% reduction in total site transfer or measured loading time. The catalog remains embedded in the page. Investigate further splitting only with startup evidence and a reliable offline/loading experience.

## Native catalog refresh — 2 October 2026

Native refresh now sends the saved opaque ETag, including its weak prefix. A valid 304 clears the transient offline/error state without assigning the catalog, rebuilding its index, invalidating its query result or writing to disk. A 200 prepares the validated catalog, search index and date label and writes its cache in a detached utility task; the main actor only accepts that prepared value. Cancellation is forwarded to preparation and checked before publication. Canceled requests do not produce an outage message.

The catalog and validator are stored together in one versioned, atomic JSON file. Existing raw catalog caches remain readable and migrate on a successful 200. Validators from rejected, older or malformed caches are discarded. Missing or malformed response validators clear the previous tag only after accepting a valid new catalog. Invalid/older responses and failed persistence preserve the usable in-memory catalog and existing offline copy. Initial bundle/cache loading and index preparation remain synchronous; cold startup is still a profiling priority.

Measured on the same arm64 Mac/macOS 26.5.1 with optimized Swift, using the real 165-venue / 2,550-serving store and an isolated disk cache. A URLProtocol fixture removes network latency and consistently returns either 200 or conditional 304. Each series excludes the first warmup 200 and measures 25 sequential refreshes. A separate main-actor task requests a pulse every millisecond; its gaps include scheduler/timer overhead and the benchmark's two-millisecond spacing.

| Unchanged-refresh workload | Before | After |
| --- | ---: | ---: |
| Catalog payload received over 25 requests | 5,997,325 bytes | 0 bytes |
| 304 responses | 0 | 25 |
| Refresh median / p95 | 5.675 / 7.419 ms | 0.182 / 0.300 ms |
| Main-actor pulse p95 / maximum gap | 6.613 / 7.450 ms | 2.078 / 2.109 ms |

When forcing a full 200 on all 25 requests, payload transfer is equal. Median / p95 completion increases from **5.600 / 6.620 ms** to **8.399 / 10.026 ms**: the new cache envelope re-encodes validated data and utility scheduling adds overhead. Main-actor pulse p95 / maximum gaps decrease from **6.127 / 7.108 ms** to **2.107 / 2.502 ms**. This supports the bounded conclusion that unchanged refresh avoids repeated work and full-response preparation yields UI execution; it does not establish lower total CPU cost for a 200.

These are model/store scheduling measurements on the Mac, not iPhone frames, useful startup, battery or field latency. There are only 46–143 pulse samples per series. Payload totals exclude HTTP headers and MapKit tiles. Do not use these timings as deterministic CI gates or a claim that the entire app is fast. Background preparation reduces one known UI execution cost; physical-device Release traces remain necessary.

The actual native store was also exercised against the live API with URLSession task metrics and an isolated cache/defaults suite: **200 → 304**, 165 venues / 2,550 servings, matching the complete bundled snapshot, checked 4 September 2026. The first compressed response transferred 36,946 body bytes (239,892 after decoding); the second transferred zero body bytes. The server's weak tag was sent unchanged, and disk bytes/modification time, search, selected venue and bookmarks were retained. This is live conditional-request evidence, not a network latency benchmark. All 19 native tests pass (16 unit and three UI); Debug tests and a Release simulator build use iPhone 17 Pro / iOS 26.5. Release rendered review checks the map, search, list and venue detail. Design remains provisional.

The conditional behavior follows [RFC 9110 If-None-Match](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-none-match); preparation uses an explicitly managed [Swift detached task](https://developer.apple.com/documentation/swift/task/detached(name:priority:operation:)-9xki7). No catalog prices, source dates or website behavior changed in this native pass.

## Native menu preparation — 2 October 2026

Both native detail implementations reuse an immutable prepared menu. Sorting and serving-price/volume/litre formatting run when the menu content or ordering changes, rather than again when source disclosure updates the view. The store retains one venue/sort presentation, validates the actual source servings on reuse, and clears it when accepting a catalog. It does not prepare every menu during startup. Each row uses its original source ordinal, preserving identity across sorts; duplicate source entries remain separate. The draft also removes its second MapKit view, but that DEBUG-only change is outside the Release measurements.

This follows Apple's [SwiftUI update and identity guidance](https://developer.apple.com/videos/play/wwdc2023/10160/): move repeatable derived work into the model and give rows stable identities. Full-catalog checks compare all 2,550 servings across every sort with the prior ordering, and verify exact grouping, unknown volumes, multipacks, starting prices, cache invalidation and reuse.

A representative **Release simulator** workload opens ALA, scrolls its complete 73-entry production menu to the source, then expands/collapses that source eight times per reported iteration. There are three reported iterations before and after, on iPhone 17e / iOS 26.5 on the arm64 Mac / macOS 26.5.1. The build is optimized and uses `ENABLE_TESTABILITY=YES` for the project's unit target; the design study is excluded. XCTest CPU/memory metrics cover the entire app, including MapKit and framework work. Clock time includes UI automation and transitions.

| Eight source toggles, mean of three iterations | Before | After |
| --- | ---: | ---: |
| Clock time | 3.251 s | 3.226 s |
| App CPU time | 1.039 s | 1.010 s |
| Peak physical memory | 108.44 MB | 113.71 MB |

The small CPU/clock change does **not establish a responsiveness improvement**. Peak memory was higher in this run, and whole-process measurements do not isolate the cache's contribution. After-sample physical-memory deltas were 32.8, 16.4 and 0 KB; this short workload cannot establish long-session behavior. Keep physical-device memory and frame profiling as a gate before promoting the draft or making app-wide speed/battery claims. Raw metrics and both result bundles are under `artifacts/menu-refinement/`.

The repeatable optimized Mac model workload also exercises ALA (73 servings), Banshee (66) and Tallink (7), each in price/litre order: five warmup and 40 measured batches of 50 repeated menu reads. It consumes every label in both paths. For ALA price order, median/p95 per read is **0.078/0.080 → 0.009/0.010 ms**, with matching checksums. This isolates avoided sorting/formatting and cached-label reuse; it is not a device or SwiftUI frame benchmark. The absolute baseline is already below a millisecond.

Reproduce the model workload:

```sh
swiftc -O -module-cache-path /tmp/beer-map-menu-modules \
  ios/BeerMap/Models.swift ios/BeerMap/CatalogRepository.swift ios/BeerMap/BeerMapStore.swift \
  scripts/benchmark-menu.swift -o /tmp/beer-map-menu-benchmark
/tmp/beer-map-menu-benchmark ios/BeerMap/Resources/venues.json
```

The store cache budget is one venue/sort, with no eager catalog-wide menu preparation or work growing with the number of disclosure updates. Repeat the opt-in UI measurement against the same build/device/workload when investigating a regression:

```sh
TEST_RUNNER_BEER_MAP_MENU_PERFORMANCE=1 xcodebuild \
  -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapUITests/VenueMenuPerformanceTests test
```

The performance test skips during ordinary correctness runs. Measurements use only the isolated UI-test preferences and offline catalog; no product bookmarks or real location are involved. A regular Release simulator build also passes without Swift warnings. Website source/data, deployed routes and the catalog's 4 September research date are unchanged.

## Native map workload and annotation lifecycle — 3 October 2026

Retained map annotations now accept source-coordinate changes through their KVO-observable coordinate. Unchanged coordinates keep their object and emit no coordinate notification. Price/serving/name/sort changes still control label configuration; source-only metadata and distance changes do not trigger price formatting. No map rebuild, new formatter, timer, network/disk operation, or per-frame visible-region scan was added. Trait-change handlers register once per custom view; CALayer border colors resolve when appearance/contrast changes.

The repeatable opt-in Release workload uses the real 165-venue catalog on iPhone 17e / iOS 26.5, hosted by the arm64 Mac / macOS 26.5.1. Each reported iteration zooms by 1.6, pans out/back across 40% of the map width, then zooms back by 0.625. Three iterations are reported before/after. The app is optimized with `ENABLE_TESTABILITY=YES` for the unit target. Product preferences and catalog refresh are isolated by the UI-test/offline arguments. MapKit still loads real geographic content, with uncontrolled system tile/cache state.

| Per zoom/pan/back iteration, mean of three | Before | After |
| --- | ---: | ---: |
| Clock time | 11.279 s | 11.033 s |
| App CPU time | 7.019 s | 6.890 s |
| Peak physical memory | 173.69 MB | 161.34 MB |

Clock ranges overlap (9.898–12.543 versus 9.836–12.625 s), as do CPU ranges (6.034–7.967 versus 5.973–7.830 s). Peak memory in the after run ranges from 156.29 to 171.22 MB; per-iteration physical-memory deltas in both runs include substantial allocations and releases. System tile/cache state is uncontrolled. The lower mean/peak in this short after run is inconclusive and cannot be attributed to the annotation changes.

These measurements include framework rendering, cache/tile activity and UI automation. They do not establish device frame delivery, startup, battery behavior or an app-wide speed improvement. The new provisional capsule/cluster palette is DEBUG-only and is outside these Release measurements; its native rendered/interactions are checked separately. Both bundles and raw samples are in `artifacts/map-hierarchy/`. Do not promote a favorable mean or a passing map gesture into a smoothness claim.

Reproduce the Release workload:

```sh
TEST_RUNNER_BEER_MAP_MAP_PERFORMANCE=1 xcodebuild \
  -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapUITests/MapInteractionPerformanceTests test
```

The check skips during ordinary correctness runs. Coordinate-notification and retained-view appearance regressions are covered by `MapAnnotationTests`; rendered navigation uses `testDesignClusterZoomPinAndAppearanceContinuity`. Full physical-device frame/memory traces remain the gate for performance claims. No web source, published data or deployment changed in this pass.

## Map layout validation — 3 October 2026

This pass corrects attribution overlap and text clipping, rather than implementing a runtime optimization. It uses normal SwiftUI layout to give the native MapKit canvas and status/control row separate bounds. There is no new geometry-preference loop, per-frame callback, polling, catalog preparation or network request. The appearance override is resolved once for isolated UI-test launches; ordinary launches retain system appearance.

Actual optimized Release correctness workloads use all 165 real venues on iPhone 17e / iOS 26.5, on the arm64 Mac / macOS 26.5.1. The map is 390 × 454 points at ordinary text and 390 × 236.3 points at the largest accessibility category with the offline caption. Loaded light/dark screens, largest-text filter scrolling/selection, detail camera continuity and the existing list/save/serving/litre/empty flows pass. At that milestone, larger captions and denied-location messages remained separate coverage; the denied flow is addressed below. Final results/geometry: `artifacts/map-attribution/release-product-final.xcresult` and `final-release-attachments/` in that folder.

These are layout and interaction checks, not time-to-content, frame delivery, CPU, memory or battery measurements. The earlier pan/zoom timing table cannot be treated as a before/after measurement of this different canvas. Keep physical-device Release profiling as the performance gate; repeat traces when investigating a measured cost, rather than running noisy timings solely for an interface correction.

## Location request lifecycle and layout — 3 October 2026

The denied-location correction removes a persistent warning from normal map/list layout. On the same iPhone 17e / iOS 26.5 Simulator and arm64 Mac / macOS 26.5.1, an actual system denial and cold relaunch previously left only a 390 × 24-point map at the largest accessibility category. The final optimized Release flow leaves 390 × 236.3 points; ordinary text retains 390 × 454 points. These are rendered layout bounds, not speed measurements. Baseline is Debug; final UI checks cover both Debug and Release. Results and geometry: `artifacts/location-access/`.

The provider still requests one fix at hundred-metre accuracy with `requestLocation()`. An explicit request phase ignores repeated taps and repeated authorization callbacks while a fix is pending. A controlled manager check verifies one position request after authorization, rather than restarting it on every authorization callback. Request feedback is owned by the initiating control, and a stale alert dismissal cannot erase a newer issue. The system manager is excluded from Observation tracking; map/list views no longer observe warning text. The code review adds no polling, continuous GPS updates, location history, decoding, sorting, marker formatting, network or disk work.

Eight request-lifecycle unit checks pass in Debug and optimized Release. Three real Simulator permission-denial UI checks pass in each configuration, including cold launch, light/dark, maximum text, cancellation, exact serving filtering and active-sheet recovery. Settings launch is verified; app-specific Settings routing is not. Retry, restricted access and services-unavailable behavior have controlled-model coverage, with real-device/rendered coverage still pending.

No startup, frame-delivery, CPU, memory or battery improvement is inferred from these checks or from request counts. Continue with physical-device Release traces and production-browser workloads before claiming the products are fast. Earlier map/menu timings do not measure this permission flow.

The complete Debug suite took about 312 seconds and exceeded the MCP response timeout, while its underlying Xcode run completed successfully (45 passed, two opt-in checks skipped, zero failed). The finished result bundle and build log confirmed completion. For future MCP runs, split model/product checks and the five draft UI checks into sequential calls to stay below the 300-second response limit; do not start a second Simulator run while the first is still executing. The scoped final Release run completed in about 203 seconds (31 model and nine product UI checks).

Reproduce the focused Release request/recovery checks:

```sh
xcodebuild -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapTests/LocationProviderTests \
  -only-testing:BeerMapUITests/LocationUITests test
```

The UI checks reset and deny authorization only for the test app in Simulator and restore its authorization state afterward. They never grant location access or change a physical device's privacy settings. Use the full product checks for map attribution, detail camera continuity and exact serving/save/search semantics.

## Detail typography and serving layout — 3 October 2026

This pass fixes rendered layout at larger text sizes. It reuses the existing bounded prepared-menu cache and lazy menu containers. `MenuServingValues` consumes prepared labels and chooses its layout axis from Dynamic Type; it adds no menu sorting/formatting, network/disk work, marker updates or timer. Product presentation expands for accessibility text while ordinary text retains its compact columns.

The representative optimized Release correctness workload uses the real catalog on iPhone 17e / iOS 26.5 Simulator, on the arm64 Mac / macOS 26.5.1, at 390 × 844 points. It exercises opening/scrolling the 73-serving ALA menu, reading exact values, source disclosure for unknown-volume servings, the six-bottle quote and return to search context. Debug additionally checks the provisional grouped draft and its exact 3000 ml serving. It verifies an actual font-height increase, full-width values, a one-line menu heading, stacked count and full initial accessible sheet. Ordinary light and dark maximum-text screens are inspected.

Captured layout changes at maximum text: the product quote grows from 38.3 to 65.3 points high; the draft's 3000 ml label uses one 58.7-point line instead of two totaling 116.7 points; its menu heading fits one 65.7-point line instead of 130.7 points across two lines. These are UI bounds, not timing measurements. Baseline is Debug; final checks cover Debug and optimized Release. Proof: `artifacts/detail-accessibility/`.

No startup, frame-rate, CPU, memory or battery improvement is claimed. Existing noisy source-toggle/map timings do not measure this layout change. Continue with Release launch/search/scroll traces and physical-device frame delivery before calling the app fast. Repeat the focused correctness gate with:

```sh
xcodebuild -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapTests/VenueMenuTests \
  -only-testing:BeerMapUITests/DetailLayoutUITests test
```

The draft-specific test and `--design-max-text` are DEBUG-only. The product uses `UICTContentSizeCategoryAccessibilityXXXL` for isolated maximum-text UI launches; normal launches follow the system. Split broad checks into sequential calls as described above.

## Overview and keyboard layout validation — 3 October 2026

This correction changes layout axes, bounded icon targets and active-search composition. It consumes the existing cached query/prepared serving labels and lazy list containers. There is no added catalog normalization, menu sorting, formatting, decoding, timer, network/disk work or annotation rebuilding. Search presentation is local view state. The draft summary consumes the already computed result count.

The real-catalog correctness workload runs on iPhone 17e / iOS 26.5 Simulator, 390 × 844 points, on the arm64 Mac / macOS 26.5.1. Optimized Release exercises typing/search with the keyboard, tapping a visible result, returning to the query, scrolling exact unknown-size/multipack quotes, saving via the full 44-point target, compact ordinary-text prices, detail/source and existing map/filter/camera paths. Debug also checks all three provisional drafts at maximum text and C's per-litre mode. Final counts and screenshot/geometry evidence are recorded in `DEVELOPMENT.md` and `artifacts/overview-accessibility/`.

The increased map/name bounds are layout measurements. No latency, missed-frame, CPU, memory or battery improvement is claimed. Useful startup and synchronous bundle/cache decode/index work are the next bounded profiling priority. Physical-device frame delivery and production-browser workloads remain required before describing either product as fast. Repeat the focused optimized layout gate with:

```sh
xcodebuild -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapUITests/OverviewLayoutUITests test
```

Release runs three product checks; Debug adds the two draft checks. Test flags isolate bookmarks/cache and offline content from user state. This is an interaction/correctness gate, not a timing benchmark.

## Native warm launch baseline — 4 October 2026

The new opt-in `LaunchPerformanceTests` measures two launch endpoints without changing product code. Apple's [launch metric](https://developer.apple.com/documentation/xctest/xctapplicationlaunchmetric) separates first-frame presentation from [a responsive frame](https://developer.apple.com/documentation/xctest/xctapplicationlaunchmetric/init%28waituntilresponsive%3A%29?language=objc). Neither endpoint proves that map tiles or prices have finished painting. Each iteration separately requires the map overview, the real 165-place count and a price annotation; final loaded screenshots were inspected.

Reference: arm64 Mac / macOS 26.5.1, iPhone 17e / iOS 26.5 Simulator, 390 × 844 points. The real 165-venue / 2,550-serving catalog is unchanged from `089937a`, researched on 4 September. Release uses `-O` with `ENABLE_TESTABILITY=YES` for the project's unit target; DEBUG design studies are excluded. `--uitesting --offline` isolates preferences/cache and skips venue API refresh. These repeated launches use warm OS/filesystem caches. MapKit still loads real geographic content with uncontrolled tile/network/cache state. Persistent cached-catalog startup, physical-device cold launch and time to useful painted content are not measured.

| Launch endpoint, five reported samples each | Median | Range |
| --- | ---: | ---: |
| First frame | 0.915 s | 0.913–0.922 s |
| Responsive frame | 1.034 s | 1.002–1.037 s |

These are two different endpoints in the same implementation, **not before/after results**. XCTest launch instrumentation and UI automation remain part of the setup. Provisional investigation thresholds for this same warm Simulator workload are a median below 1.0 s for first frame and 1.2 s for responsive frame; investigate repeated comparable overages. They are not deterministic CI gates or device/field budgets. No app-wide speed improvement, frame-rate, memory or battery claim follows from this baseline.

A temporary optimized Release probe timed the two synchronous app-state initializers over five isolated bundled launches: store construction median **13.585 ms** (13.432–16.065), and location-provider construction median **0.687 ms** (0.616–0.799). The store interval includes bundled loading/validation and index/date preparation; no saved catalog is present. The location interval covers its constructor, not later permission callbacks or position fixes. These monotonic wall-time intervals are not CPU samples, exclude subsequent rendering, and use a separate ordinary Release diagnostic build. Do not subtract them from the XCTest endpoint or attribute the remaining launch duration to a particular subsystem. The probe was removed and the original app source restored before the final standard Release build and rendered launch.

Installed Apple App Launch and Time Profiler capture attempts both stalled before recording began; no usable CPU trace was collected. `DevToolsSecurity -status` reports developer mode disabled. This is an observed configuration limitation, not a proven cause of the stalls. No global security setting changed. Avoid repeating stalled CLI captures on every heartbeat while that limitation persists. The measurements do not justify an asynchronous startup rewrite: preserve immediate offline content and investigate initial-view/system work, the saved-cache path and actual main-thread stacks when tracing access is available. Apple's [launch guidance](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time) favors measuring the relevant launch conditions and deferring work that is not needed for initial interaction.

Repeat the opt-in baseline:

```sh
TEST_RUNNER_BEER_MAP_LAUNCH_PERFORMANCE=1 xcodebuild \
  -project ios/BeerMap.xcodeproj -scheme BeerMap -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17e,OS=26.5' \
  CODE_SIGNING_ALLOWED=NO ENABLE_TESTABILITY=YES \
  -only-testing:BeerMapUITests/LaunchPerformanceTests \
  -parallel-testing-enabled NO test
```

Extract raw samples with `xcrun xcresulttool get test-results metrics --path <result-bundle>`. Both endpoint checks passed. With the opt-in variable absent, both skip and no launch measurement runs. The regular Release build without testability also passes without Swift warnings and its real price map was inspected after restoring the original source. Local proof, raw samples, the removed probe patch/helper and five phase logs are under `artifacts/launch-performance/`. Native design remains provisional; no web, venue-data, deployment or physical-device change occurred.

## Implementation and correctness

- Web prepares normalized venue and beer search text once per immutable catalog; native rebuilds its index only when accepting a catalog. Web index preparation measured 1.04 ms on the reference Mac; native index preparation is not yet separately profiled.
- Each query selects the best matching serving with one scan instead of sorting every menu. Venue result ordering and full-menu/source behavior are preserved, including unknown volume, exact sizes, multipacks, and “from” prices.
- Native keeps one cached query input/result, including filters, location and the current minute when the open-only filter applies. Catalog acceptance clears it; saved-place filtering reads current bookmarks. Typing does not grow an unbounded cache. The catalog date label is prepared once.
- Web reuses currency/collation formatters, memoizes stable list rows and compares marker input identity instead of serializing every menu. Native only reconfigures an existing price annotation when its displayed inputs change.
- Deferred map initialization preserves pending list selections and permalinks and provides a quiet failure/retry state. Programmatic venue camera events preserve selection; user zoom still dismisses it. Rendered review exposed repeated selection closing a mobile panel during a camera animation; that interaction was repaired and added to the existing browser regression scenario.

## Draft search layout and correctness — 4 October 2026

Draft A's maximum-text search correction is DEBUG-only. Accessibility search gets a separate band, and the retained map/list receive explicit layout bounds. No new timer, per-frame geometry callback, camera refit, annotation formatting, normalization, sorting, network or disk operation is introduced. This is a content-visibility correction, with no measured runtime speed, CPU, memory or battery benefit claimed.

The real-catalog workload runs on iPhone 17e / iOS 26.5 Simulator, 390 × 844 points, hosted by the arm64 Mac / macOS 26.5.1. Maximum-text map bounds change from 161.7 to 128.3 points with the keyboard and 181 to 167.7 points with an expanded list, while search moves out of the map. Final screenshots and assertions confirm a fully exposed real 500 ml / 6.00 EUR pin, clear native attribution and unchanged position after detail return. The smaller nominal canvas is a deliberate layout tradeoff; these bounds are not latency samples.

Eleven scoped Debug UI checks and four final optimized Release UI checks pass. The regular Release build without testability passes without Swift warnings and its loaded map was inspected. Release tests enable testability for the invocation because the unit target imports the app module; production optimization remains enabled. Models and published data are unchanged, and bundled catalog equality passes. Proof: `artifacts/map-search-layout/`; earlier failed attempts are explicitly separated from final evidence.

The old test drag overshot a quote in the small viewport; a slow drag and brief hold avoid that automation oscillation. A separate Release bookmark check initially tapped beneath the List's pinned section heading. The test now derives exposed bounds from the actual heading frame before exercising the same 44-point target. This repairs automation, with no change to product scrolling, hit areas or bookmark behavior. It is not a responsiveness improvement.

Repeat the focused draft gate in Debug with `-only-testing:BeerMapUITests/DraftMapLayoutUITests` and `-only-testing:BeerMapUITests/OverviewLayoutUITests/testDraftOverviewAndKeyboardAtMaximumText`. The map/navigation/menu regressions and optimized product gates are listed in `DEVELOPMENT.md`. Production-browser useful-content and interaction profiling is the next bounded workload; physical-device Release frames, CPU, memory, useful startup and battery remain unverified.

## Production browser workload and retained query results — 4 October 2026

The actual production build was measured on an arm64 Mac / macOS 26.5.1, Node 22.22.3, in the Codex in-app browser's Chromium 154 runtime. The mobile viewport is **390 × 844 CSS pixels, DPR 1**, with **4× main-thread CPU slowdown, 3 Mbps download, 1 Mbps upload and 150 ms emulated latency**. Browser HTTP cache is bypassed for these navigations. The desktop correctness review uses 1280 × 900. The real 165-venue / 2,550-serving catalog still carries its 4 September evidence date.

A loopback-only wrapper injects the opt-in `scripts/browser-performance-probe.js` into the built Worker's HTML before hydration. The CUA browser API rejects `Page.addScriptToEvaluateOnNewDocument`; the wrapper supplies the missing early observation without adding instrumentation to shipped bundles. It binds only to `127.0.0.1`, forwards public GET/HEAD requests to the local built Worker, preserves gzip/Brotli encoding, buffers HTML and adds **5,895 raw injected bytes** in the timing series. A later correction to the diagnostic detail-heading selector changes this to **5,904** bytes for final proof/recheck; the main comparison is not mixed across those probe revisions. Reports require a per-run token, are limited to 1 MiB and stay in ignored artifacts. HTML buffering, recompression and probe overhead limit direct comparison with the live CDN. Host/filesystem/GPU state is warm; external tile caches are uncontrolled. This is desktop Chromium under emulation, not mobile Safari or physical-iPhone evidence.

Three unprofiled navigations give **FCP 988 / 984 / 928 ms** (median **984 ms**). All 165 price-marker DOM nodes, with the loading status removed, reach the probe's second animation-frame opportunity at **4,357.6 / 4,298.9 / 4,319.7 ms** (median **4,319.7 ms**). The earlier `server-content` checkpoint records existing catalog count/search markup; the mobile drawer can be hidden and hydration may still be pending. It is not an interactive-startup endpoint. The priced checkpoint is DOM availability plus a frame opportunity, not a measured time to completely painted prices. Actual loaded tiles/prices were reviewed separately in screenshots.

One additional startup CPU capture lasts 4.427 s and contains 3,707 main-thread samples. About 3.508 s is classified as idle; workers, compositor and GPU activity are excluded. The map runtime starts downloading around 1.65–1.69 s in the unprofiled baseline; glyph requests appear around 3.20 s and complete around 4.21 s. The waterfall warrants investigation before a larger rewrite. Resource Timing omits worker requests and restricts cross-origin sizes; zero reported bytes are not evidence of zero tile/glyph transfer. The CPU-profile capture is excluded from the three baseline medians. A later after-build sanity navigation has FCP 984 ms and priced DOM/frame opportunity 4,410 ms; this pass establishes no startup speedup.

### Measured interaction and implementation

Three unprofiled cycles open the mobile list, type `ipa` using trusted sequential keyboard events, then press **Notīrīt meklēšanu**. Prefix/result/marker counts remain **i → 165, ip → 68, ipa → 62, clear → 165**. Each sample below runs from the capturing input/click listener to the second animation-frame callback and records the resulting count and markers. It excludes earlier input queueing and does not measure compositor frame delivery or field INP. Native Event Timing entries are retained as a separate diagnostic, including their quantized durations.

| Workload, median of three | Before | After |
| --- | ---: | ---: |
| Type `i` | 39.5 ms | 17.8 ms |
| Type `ip` | 83.1 ms | 74.9 ms |
| Type `ipa` | 46.1 ms | 38.1 ms |
| Clear and restore all places | 80.5 ms | 70.8 ms |
| Retained marker text nodes after `i`, out of 165 | 0 | 164 |

Raw before → after samples in milliseconds: `i` **39.5, 39.9, 36.6 → 20.2, 15.7, 17.8**; `ip` **88.7, 83.1, 73.9 → 82.4, 70.0, 74.9**; `ipa` **46.1, 50.3, 41.4 → 42.1, 36.2, 38.1**; clear **80.5, 75.3, 143.2 → 83.8, 70.8, 70.4**. Matched Event Timing input durations for `i` are **64, 64, 56 → 40, 32, 32 ms**. With three samples per step, no p95, universal speedup or application-wide responsiveness claim is justified. The preserved 164 text nodes are direct evidence of avoided unchanged-marker work.

A final-build sanity recheck, after the camera correction below, repeats three trusted unprofiled cycles with the same viewport, throttling and cache bypass. Medians are **16.3 / 70.7 / 36.4 / 75.0 ms** for `i` / `ip` / `ipa` / clear, with the same counts and exact menus. Its single startup checkpoint reaches priced DOM/frame opportunity at **4,355.8 ms**. These final-source samples are separate from the comparison table; they establish no startup improvement.

The indexed query previously returned a new venue object for every match, causing React's memoized rows and the marker identity guard to miss unchanged results. It now keeps **one previous projection per immutable source venue**. Reuse requires the same winning source serving and the same complete ordered sequence of visible menu entries. A narrowed menu invalidates the projection even when its cheapest quote remains equal. There is no query-history cache, eager menu formatting, additional network request or timer. The new full-menu/invalidation checks and existing 96 query/band/sort comparisons preserve exact sizes, multipacks, starting prices, unknown volumes and ranking. The final initial-page budget is **901,710 raw / 211,238 gzip bytes**, up 316 / 135 bytes from this run's baseline and below the existing gates.

A final dense-map interaction performs one zoom in, a horizontal 100-CSS-pixel pan and return, then one zoom out. All 165 markers remain attached; no venue detail is unexpectedly opened. Four bounded rAF windows contain **100 / 137 / 117 / 95 gaps**, with medians **8.3 / 8.3 / 8.4 / 8.4 ms** and maxima **17.4 / 17.5 / 42.4 / 17.6 ms**. No gap exceeds 50 ms in those windows. They measure scheduling opportunities on this host, not displayed FPS, device frame delivery or a before/after pan improvement. There is no memory, battery or cache-efficiency measurement in this slice. Dense price overlap remains a visible product problem.

Rendered correctness covers mobile selection and the settled ALA panel (226 × 345 CSS pixels at x82/y250, clear of bottom controls), all **73** menu entries, **3000 ml / 18.90 EUR / 6.30 EUR per litre**, filtered **500 ml Hazy IPA / 5.50 EUR**, Swings' unknown volume without an inferred litre value, original source links and retained desktop marker-button identity/focus through Enter expansion/collapse. The mobile timeline passes a settled **1395 → 1410** keyboard step. Intermediate camera/scroll frames are preserved separately and are not treated as final geometry. Native layout was not changed by this web pass; its complete direction remains provisional.

Final rendered review reproduced a mobile repeated-selection defect: choosing the already-open ALA result moved its source footer to **731 px**, below the **717 px** top of the floating results control. Selecting the same ID does not rerun the marker centering effect. The venue camera command now includes the existing panel's measured height in its mobile offset. Final and repeated selections settle at x82/y249.5 with the source footer at **592.5 px**, clear of controls, while retaining all 73 rows and the litre quote. New selections keep the existing centering path. The existing browser regression script includes this clearance assertion; its extended CLI scenario was syntax/lint checked, and the equivalent interaction was exercised through CUA on the production build. No claim is made that the entire standalone browser suite ran this pass.

Authoritative local proof: `artifacts/browser-performance/2026-10-04/summary.json`, `startup-1/3/4.json`, `startup-2-cpu.json`, `search-before-cpu.json`, `search-before-unprofiled.json`, `search-after-unprofiled.json`, `identity-before/after.json`, `map-after-final.json`, `mobile-reselection-before/after/repeat.json`, `mobile-reselection-before/after.jpg`, `desktop-proof-final.json/jpg`, `search-final-unprofiled.json` and `timeline-regression-final.json`. The complete JPEGs come from CUA `getScreenshot()` and supersede initially cropped CDP PNGs (`mobile-regression.png` / `desktop-regression.png`). A desktop capture during viewport resizing and an intermediate clipped expansion are not final proof; the final desktop reload uses its actual viewport and waits for the detail animation to finish. Live orientation changes are not verified. The early profile-report command timed out after writing its complete file; the saved trace was verified before use. Initial new-test assumptions incorrectly equated all matched venues with unchanged menus; the final test uses unchanged name/full-menu cases and separately proves narrowed-menu invalidation. A timeline check initially sampled a moving/live value; its final check waits for the actual settled scroll position and quarter-hour value.

### Reproduce the production browser probe

Build first, then run the built Worker in one terminal and the wrapper in a second:

```sh
npm run build
./node_modules/.bin/wrangler dev --config dist/server/wrangler.json \
  --local --ip 127.0.0.1 --port 3017 --inspector-port 9317 \
  --persist-to /private/tmp/beer-map-web-perf-state \
  --show-interactive-dev-session=false
```

```sh
BEER_PERF_OUTPUT=artifacts/browser-performance/local \
  node scripts/serve-browser-performance.mjs
```

Open `http://127.0.0.1:3018/` in a background browser, apply the recorded viewport and tab-scoped CPU/network/cache settings, then reload. `BEER_PERF_PORT` and `BEER_PERF_UPSTREAM_PORT` can select different unprivileged loopback ports. After all markers are attached and the loading status is absent, inspect `window.__beerMapPerf.read()` or save `window.__beerMapPerf.save('startup-1', { cpuRate: 4, cacheBypassed: true })`. Use three comparable unprofiled navigations; capture main-thread CPU separately with the [Chrome DevTools Profiler](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/). For typing, record input/action offsets, perform three trusted `ipa`/clear cycles with count checks, then save. `save` returns its local filename; verify the file exists if transport times out instead of assuming failure or repeating a successful write.

Keep before/after app source, browser/runtime, proxy, viewport, throttling and interactions identifiable. Save screenshots and wait for settled camera/scroll geometry before judging layout. Close owned tabs and stop both owned servers; restore CPU rate 1, network latency 0/unlimited throughput, normal cache behavior and the default viewport. Do not clear the user's global cache/cookies or change existing tabs. This run completed that cleanup.

Provisional investigation budgets for this same local emulated workload: median FCP below **1.5 s**, priced DOM/frame opportunity below **3 s**, and each typing/clear step below **100 ms** median. Investigate repeated rAF gaps above **50 ms** during bounded gestures using a proper rendering trace. The current map startup exceeds its target. These are investigation thresholds, not deterministic CI gates, field SLOs or a declaration that the app is fast. The standing shipped-bundle budget remains unchanged.

## Prices before the basemap — 5 October 2026

The previous page waited for MapLibre's `load` event before attaching prices or opening a venue menu. That event waits for the initial map resources and render; DOM markers can attach immediately after the map is constructed. The implementation now separates **map transform/price readiness** from **basemap load readiness**. A venue permalink or the latest queued list choice supplies the initial camera. A quiet top caption, **Ielādē kartes fonu…**, stays visible while the background loads. This preserves the existing web composition and exact serving/source data. Primary references: [MapLibre load event](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapEventType/) and [immediate marker example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-default-marker/); the installed renderer is 6.11.2.

### Matching production workload

Baseline is `e1d3fe5`; final measurements include the completed retry and small-screen corrections below. Both use the built Worker via the loopback diagnostic wrapper, the same **6,201-byte** opt-in probe, and three unprofiled navigations per route. Host: arm64 Mac, macOS 26.5.1, Node 22.22.3, IAB Chromium 154; **390 × 844 CSS pixels, DPR 1, CPU 4×, 375,000 B/s download, 125,000 B/s upload, 150 ms latency, browser cache bypassed**. Host/filesystem/GPU state is warm; external tile/CDN cache state is uncontrolled. The wrapper buffers/recompresses HTML. These are host emulation samples, not physical-iPhone/Safari, cold-CDN, compositor frame, memory, battery or field-INP evidence.

Endpoints below use DOM detection followed by a second rAF opportunity from navigation start. `client-controls` detects the effect-mounted time control; it does not itself establish list interactivity. `prices-attached` detects all 165 price nodes. `venue-detail` detects the full menu/footer DOM, before its camera/animation necessarily settles. The retained `price-markers` endpoint requires all prices and a dismissed loading caption, associated with MapLibre's first `load`; it remains separate from early content and delivered frames.

| Median of three | Before | Completed source |
| --- | ---: | ---: |
| Overview FCP | 920 ms | 960 ms |
| Overview client-control DOM/frame opportunity | 1,581.9 ms | 1,728.8 ms |
| Overview 165 prices attached | 4,157.2 ms | **2,696.9 ms** |
| Overview prices plus basemap-loading completion | 4,157.2 ms | 4,302.6 ms |
| ALA permalink FCP | 968 ms | 984 ms |
| ALA client-control DOM/frame opportunity | 1,581.2 ms | 1,713.3 ms |
| ALA full 73-row menu/footer DOM/frame opportunity | 4,186.3 ms | **2,704.4 ms** |
| ALA prices plus basemap-loading completion | 4,186.3 ms | 4,268.5 ms |

Prices attach **1,460.3 ms / 35.1% earlier** in the overview; the linked menu attaches **1,481.9 ms / 35.4% earlier**. This reaches the provisional 3 s useful-price/menu investigation target in this workload. It does not improve the basemap endpoint. The control endpoint is about **132–147 ms later**, and FCP is slightly later; their cause is unisolated and remains a profiling priority. Recovery reads session storage only for an explicit retry, but that restriction did not eliminate the measured control delay. Do not describe the whole app, initial controls or basemap as faster on this evidence.

Raw second-rAF samples in ms: overview prices **4,208.1 / 4,156.7 / 4,157.2 → 2,669.1 / 2,712.0 / 2,696.9**; overview loading completion **4,208.1 / 4,156.7 / 4,157.2 → 4,281.5 / 4,310.4 / 4,302.6**. ALA menu **4,253.6 / 4,178.1 / 4,186.3 → 2,705.0 / 2,704.4 / 2,691.1**; ALA loading completion **4,253.6 / 4,178.1 / 4,186.3 → 4,270.3 / 4,268.5 / 4,263.6**. All matching startup runs retain 165 prices; linked runs retain 73 menu rows. Small samples justify neither p95 nor a universal speed claim.

Ignored evidence is under `artifacts/browser-startup/2026-10-05/`: `overview-before-{1,2,3}`, `linked-before-{1,2,3}`, `overview-completed-{1,2,3}`, `linked-completed-{1,2,3}`. Earlier `after`, `final` and `release` series are intermediate source iterations and excluded from the final comparison. The final failed-write guard changes only explicit recovery; its separate `validated-source-sanity.json` retains 165 prices/73 rows at **2,714.9 ms** and loading completion at **4,269 ms**. Final-source recovery retains **270 minutes**, the newer Swings choice, its search/band/sort, nine rows and one unknown-unit marker; `validated-source-recovery.json` records the consumed context/clean URL. `validated-source-proof.jpg` confirms the finished ALA screen. Repeat using the production-wrapper commands above and identical emulation/probe settings; save untouched navigations separately from interactions/screenshots. The diagnostic probe remains outside the application bundle.

### Recovery and rendered correctness

A separate final-source early-choice workload opens the list at **1,764 ms** and clicks ALA at **2,094 ms**, while zero price nodes exist; the full menu reaches its DOM/frame opportunity at **2,679.5 ms**, with the background caption still visible. The open/choice clicks are trusted browser events; search was filled with the CUA locator and is not a keyboard latency benchmark. `early-completed-proof.jpg` shows useful menu content with a still-loading background, not a completed map. `linked-completed-proof.jpg` shows the completed background and settled 226 × 345 panel at x82/y250, footer bottom593 versus control top717.

Blocking the runtime chunk reproduced an existing broken retry: repeating the failed dynamic import did not issue a working recovery. [Vite documents this browser limitation](https://vite.dev/guide/troubleshooting#failed-to-fetch-dynamically-imported-module-error). Retry now performs one user-initiated document reload. A one-shot, five-minute session context restores search, price band, sorting, the latest chosen venue and custom time; its URL flag is removed after hydration. Ordinary loads skip storage recovery. A failed storage write clears any older context first, so it cannot restore an obsolete choice. If storage is unavailable, the chosen venue still travels in the URL; filters/custom time may reset. There is no automatic reload loop or persistent query-history cache.

Controlled browser checks start at the ALA permalink, block runtime loading, then choose Swings Golf, **under5 / litre** and a custom time. A retry while still blocked remains a stable failure with context intact; after unblocking, retry opens the newer Swings choice, preserves the filters/time, consumes the session entry and removes the URL flag. The intermediate retry-recovery check retains **255 minutes**, one unknown-volume marker (**— €/l**) and nine under5 menu entries; ordinary reload restores default filters/live time and the full ten-entry menu. Failure-button contrast is corrected. Proofs include `retry-failure-final.jpg`, `retry-recovered-final.jpg` and `retry-release-proof.json`; they distinguish intermediate recovery checks from the completed startup source. The recovery/expiry checks are part of the required 16-check unit gate.

Smaller rendered review at **320 × 568** found the settled ALA footer ending at **455 px**, below the results control's **441 px** top. The camera now measures the actual map bounds/control once per selection and shifts only enough to clear it. Final and repeated selections keep the 73-row menu at x47/y80, footer bottom**423**, leaving **18 px** clearance. The 390 × 844 composition is preserved. `small-completed-proof.jpg` supersedes the overlapping/intermediate capture. This adds two layout reads per camera calculation; there is no pan/zoom frame callback or marker rebuild for this correction.

Desktop **1280 × 900** review retains the exact **3000 ml / 18.90 EUR / 6.30 EUR per litre** result, 73 rows, source link and keyboard focus through Enter collapse/expansion. End scroll settles at **3937**, equal to the menu's scrollHeight minus clientHeight. `desktop-completed-settled.jpg` supersedes the animation capture. No venue data, source dates or native UI changed; native A/B/C and the complete native visual direction remain provisional.

`npm run build` passes lint, types, all **16** unit/API/recovery checks, menu/timeline/data audits, iOS snapshot equality and the production output budget. Final hydration output: **903,470 raw / 211,922 gzip bytes**, up **1,760 / 684** from baseline, below the existing 1,000,000 / 250,000 gates. The extended standalone browser scenario has syntax/lint validation and equivalent recovery/clearance flows through CUA on production builds; the entire standalone CLI browser suite was not run. Temporary emulation, the owned tab and loopback services are cleaned up after review. This is local validation; no deployment, push, physical-device installation or App Store release is inferred.

## Repeatable checks and budgets

Draft A's visible-area panel (2 October) adds one coordinate/ID scan after a settled map region or data update. Publication is deferred out of `updateUIView`, canceled/coalesced when superseded, suppressed during camera movement, and skipped when membership is unchanged. There is no per-frame visible-region callback. The panel filters the existing cached, ordered query result by ID; it does not normalize search, sort menus, reformat the catalog date, or perform disk/network work. Existing annotation objects are retained. Other map surfaces have no area callback and return before scheduling a task.

This is a bounded implementation cost, not measured frame-delivery evidence. The area panel is DEBUG-only, so a Release build cannot establish its runtime behavior. Its interaction/layout checks use iPhone 17e / iOS 26.5 with the real 165-venue catalog, dark appearance and accessibility text size 1. Physical-device Release profiling remains a gate before moving the provisional design into the product or claiming smooth pan/zoom, memory or battery improvements.

Run `npm run perf:query` for the web CPU workload. Run `npm run build` for lint, types, serving/API tests, menu/timeline/data checks, bundled snapshot consistency and production output. Its postbuild check enforces the initial page JS budget: **1,000,000 raw bytes and 250,000 gzip bytes**. Run `npm run perf:bundle` to inspect an existing build. The budget excludes frameworks, deferred map renderer, worker and tiles; adding routes requires deliberately revisiting the check.

Run the native benchmark from the repository root:

```sh
swiftc -O -module-cache-path /tmp/beer-map-perf-modules \
  ios/BeerMap/Models.swift ios/BeerMap/CatalogRepository.swift ios/BeerMap/BeerMapStore.swift \
  scripts/benchmark-ios.swift -o /tmp/beer-map-query-benchmark
/tmp/beer-map-query-benchmark ios/BeerMap/Resources/venues.json
```

The native harness uses an isolated defaults suite, reads the supplied catalog as its cache, performs no refresh and deletes its own defaults suite afterward. It does not alter app bookmarks. Baseline timings were captured before this pass against commit `06c0904`; the web baseline uses the same workload with `queryVenues` rather than the new prepared factory. Machine-load-sensitive query timings are recorded manually, not treated as deterministic CI gates. Aim for p95 query computation below 4 ms on the reference workload; use physical-device traces for actual interaction goals.

Run the native refresh workload and real read-only API probe:

```sh
swiftc -O -module-cache-path /tmp/beer-map-refresh-modules \
  ios/BeerMap/Models.swift ios/BeerMap/CatalogRepository.swift ios/BeerMap/BeerMapStore.swift \
  scripts/benchmark-refresh.swift -o /tmp/beer-map-refresh-benchmark
/tmp/beer-map-refresh-benchmark ios/BeerMap/Resources/venues.json
/tmp/beer-map-refresh-benchmark ios/BeerMap/Resources/venues.json --full-response

swiftc -O -module-cache-path /tmp/beer-map-refresh-modules \
  ios/BeerMap/Models.swift ios/BeerMap/CatalogRepository.swift ios/BeerMap/BeerMapStore.swift \
  scripts/probe-native-refresh.swift -o /tmp/beer-map-native-refresh-probe
/tmp/beer-map-native-refresh-probe ios/BeerMap/Resources/venues.json
```

Both refresh tools delete their own temporary cache/defaults and do not touch product bookmarks. The benchmark uses stubbed transport; the probe makes two actual requests. The refresh baseline uses `BeerMapStore.swift` from `804dcee` with the same current models/harness; omit `CatalogRepository.swift` when compiling that baseline. The probe reports snapshot equality rather than requiring it, so future genuine catalog updates remain observable. It requires a valid 200 then 304 and retained interaction/cache state.

Ignored local raw measurements/build logs are under `artifacts/performance/`. Keep durable conclusions here rather than relying on ignored artifacts to communicate the result.

## Next profiling priorities

1. Measure native Release cold/warm startup, time to useful offline content, typing, scrolling, opening a dense venue/menu and map pan/zoom on a physical iPhone. Capture a trace before claiming smooth frame delivery or battery efficiency. A 60 Hz frame has about 16.7 ms available; look at actual missed frames and main-thread work, not just model timing.
2. Profile browser parsing/hydration and early list/control interactivity, then the remaining map-runtime/worker/glyph waterfall. The 5 October production workload attaches prices/linked menus around 2.70 s, while basemap completion remains 4.27–4.30 s and the control endpoint is about 132–147 ms later than baseline. Isolate those costs before more optimization. Repeat comparable production measurements and actual screens; physical-mobile/Safari and cold-CDN behavior remain gates.
3. Resume native CPU/SwiftUI tracing when access is available; the warm Release endpoint baseline and temporary initializer wall timings are recorded above. App Launch/Time Profiler currently stall before recording and developer mode reports disabled; do not repeat unchanged attempts every heartbeat. Profile the saved-cache path, initial-view/system work, cold launch and fresh 200 refresh while preserving immediate offline content and source freshness.
4. Review the web dense overview: the 165 price pins still overlap heavily. Unchanged query projections now skip marker/list work, but there is no device memory or delivered-frame proof. Measure marker lifecycle and render/memory costs before choosing collision handling or clustered/WebGL layers. Native MapKit already clusters. Preserve exact price meaning, keyboard focus, full menus, source links and selected-place context.
5. Audit retained map objects, canceled async loads, cache size, repeated network requests and idle work. Re-run a broader performance trace only for new concerns or meaningful changes, avoiding expensive redundant checks every heartbeat.

Design remains provisional: draft A is the current working direction, not user-approved. Faster queries do not establish visual quality. Review real native screens and web interactions as part of each meaningful interface milestone.

Primary guidance: [Apple SwiftUI performance](https://developer.apple.com/documentation/xcode/understanding-and-improving-swiftui-performance), [MapLibre current bundler/worker guidance](https://maplibre.org/maplibre-gl-js/docs/), and [MapLibre large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/). Use the SwiftUI Performance Audit skill for code-first investigation and escalate to traces for unresolved costs.
