# Performance requirements and evidence

Updated 2 October 2026. The user requires both the website and native iPhone app to feel fast while retaining excellent, clean design. Useful startup, responsive search, smooth lists and map movement, efficient network/cache behavior, and bounded memory/CPU/battery use are standing product requirements. The existing five-hour continuation may be revised independently as evidence changes; keep its cadence and quiet background behavior.

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

## Implementation and correctness

- Web prepares normalized venue and beer search text once per immutable catalog; native rebuilds its index only when accepting a catalog. Web index preparation measured 1.04 ms on the reference Mac; native index preparation is not yet separately profiled.
- Each query selects the best matching serving with one scan instead of sorting every menu. Venue result ordering and full-menu/source behavior are preserved, including unknown volume, exact sizes, multipacks, and “from” prices.
- Native keeps one cached query input/result, including filters, location and the current minute when the open-only filter applies. Catalog acceptance clears it; saved-place filtering reads current bookmarks. Typing does not grow an unbounded cache. The catalog date label is prepared once.
- Web reuses currency/collation formatters, memoizes stable list rows and compares marker input identity instead of serializing every menu. Native only reconfigures an existing price annotation when its displayed inputs change.
- Deferred map initialization preserves pending list selections and permalinks and provides a quiet failure/retry state. Programmatic venue camera events preserve selection; user zoom still dismisses it. Rendered review exposed repeated selection closing a mobile panel during a camera animation; that interaction was repaired and added to the existing browser regression scenario.

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
2. Capture a production browser trace with a realistic mobile CPU/network profile. Measure useful content, typing/filter updates, marker/menu rendering and dense overview pan/zoom. Record the actual CSS viewport and runtime, and reset temporary emulation after checks.
3. Profile synchronous bundle/cache startup and index preparation, plus fresh 200 refresh on a physical device. Conditional refresh and off-actor remote preparation are implemented; investigate remaining work from a trace while preserving immediate offline content and source freshness.
4. Measure browser marker updates and memory before deciding whether to replace DOM markers with clustered/WebGL layers. Native MapKit already clusters. Preserve keyboard focus, full menus and legible selected-place state through any change.
5. Audit retained map objects, canceled async loads, cache size, repeated network requests and idle work. Re-run a broader performance trace only for new concerns or meaningful changes, avoiding expensive redundant checks every heartbeat.

Design remains provisional: draft A is the current working direction, not user-approved. Faster queries do not establish visual quality. Review real native screens and web interactions as part of each meaningful interface milestone.

Primary guidance: [Apple SwiftUI performance](https://developer.apple.com/documentation/xcode/understanding-and-improving-swiftui-performance), [MapLibre current bundler/worker guidance](https://maplibre.org/maplibre-gl-js/docs/), and [MapLibre large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/). Use the SwiftUI Performance Audit skill for code-first investigation and escalate to traces for unresolved costs.
