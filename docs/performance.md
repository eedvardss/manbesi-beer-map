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

## Implementation and correctness

- Web prepares normalized venue and beer search text once per immutable catalog; native rebuilds its index only when accepting a catalog. Web index preparation measured 1.04 ms on the reference Mac; native index preparation is not yet separately profiled.
- Each query selects the best matching serving with one scan instead of sorting every menu. Venue result ordering and full-menu/source behavior are preserved, including unknown volume, exact sizes, multipacks, and “from” prices.
- Native keeps one cached query input/result, including filters, location and the current minute when the open-only filter applies. Catalog acceptance clears it; saved-place filtering reads current bookmarks. Typing does not grow an unbounded cache. The catalog date label is prepared once.
- Web reuses currency/collation formatters, memoizes stable list rows and compares marker input identity instead of serializing every menu. Native only reconfigures an existing price annotation when its displayed inputs change.
- Deferred map initialization preserves pending list selections and permalinks and provides a quiet failure/retry state. Programmatic venue camera events preserve selection; user zoom still dismisses it. Rendered review exposed repeated selection closing a mobile panel during a camera animation; that interaction was repaired and added to the existing browser regression scenario.

## Repeatable checks and budgets

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
