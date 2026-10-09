# Performance requirements and evidence

Updated 8 October 2026. The user requires the website to feel fast while retaining excellent, clean design. Useful startup, responsive search, smooth lists and map movement, efficient network/cache behavior, and bounded memory/CPU/battery use are standing product requirements. The scheduled continuation was removed at the user's request; earlier schedule references are historical.

Since 9 October 2026 the web app lives in `application/`. Source paths (`app/`, `scripts/`, `artifacts/`, `dist/`) and npm commands in this document are relative to `application/`; run them after `cd application`.

## API frontend and Docker optimization — 8 October 2026

The browser now loads the complete catalog through the REST API backed by
PostgreSQL in Docker. Removed venue research and opening-hour data from client
imports by splitting pure model/time helpers from source data. Validate each
received snapshot once, prepare its search index and numeric opening intervals
once, and retain the same snapshot/index/DOM on 304. No network requests occur
on typing or filtering. A failed refresh retains the current view with an
explicit notice. The refresh action and visible-page/focus revalidation after
30 seconds preserve filters, selected place, and map instance.

API requests retain one immutable document. A database trigger assigns a new
revision on every SQL update; unchanged queries return the revision without
transferring the payload. Health checks fetch only row existence. The runtime
uses production dependencies, built assets and compiled migration/seed scripts.
Precomputed Brotli/gzip variants avoid static compression work on requests.

Measured production builds on Windows / Docker Desktop 4.94.0, Engine 29.8.2,
Linux amd64, Node 22.23.3 and PostgreSQL 17.11:

| Measurement | Before | After |
| --- | ---: | ---: |
| Docker image bytes (uncompressed image metadata) | 1,418,487,088 | 904,065,937 |
| Page hydration JavaScript bytes | 903,832 | 230,097 |
| Page hydration gzip bytes (build budget) | 211,999 | 77,714 |

The hydration budget is now 300,000 raw / 100,000 gzip bytes. A real background
Chrome session received 73,770 bytes for the Brotli page chunk and 37,380 bytes
for the compressed catalog. This is not the full transfer: framework, styles,
deferred map renderer, worker and map tiles are separate resources. The prior
browser received the original page chunk uncompressed at 903,832 bytes.

With browser cache disabled via routing, three local navigations took
101/82/86 ms from automation navigation to first visible venue row. Six search
fills through the next animation frame took 25/60/17/18/16/43 ms including
automation overhead. These small local samples are descriptive; there is no
comparable pre-change startup/typing series and no claim of improved device
frame rate, p95 latency, memory or battery use.

Validation: 19 unit/API/projection/recovery tests, data audit, bundled native
snapshot equality, both production build targets, real PostgreSQL integration
tests, actual Docker start, page/assets/health/API/304 checks, initial loading
and 503/retry, failed refresh preservation and 304 marker identity, and the full
existing desktop/mobile browser regression executed through Playwright CLI.
Actual browser review covered desktop plus 390×844/320×568 mobile menu and
timeline interactions. A direct SQL change to name, price and
opening hours appeared after frontend refresh without rebuild; original data
was restored byte-for-byte. Proof is in ignored `output/playwright/` and
`artifacts/`. CI has additional container compression and browser checks;
the updated CI job has not yet run remotely. No public deployment occurred.

## Measured query and bundle improvements

Reference environment: arm64 Mac, macOS 26.5.1, Node 22.22.3. The workload uses the real 165-venue / 2,550-serving catalog checked on 4 September 2026. No new menu evidence or prices are implied.

| Measure | Before | After |
| --- | ---: | ---: |
| Website query median | 0.627 ms | 0.063 ms |
| Website query p95 | 0.667 ms | 0.084 ms |
| Initial page JS, raw | 1,964,763 bytes | 901,394 bytes |
| Initial page JS, gzip | 494,579 bytes | 211,103 bytes |

Query timings are percentiles of eight-query batch averages, normalized to milliseconds per query. Ten warmup batches and 80 measured batches (640 queries) cycle through empty search, typing prefixes, IPA, ASCII Latvian search, address search and no matches, with all price bands and price/litre/name sorting. Before/after result checksums match: `39880.88999999999`. Independent correctness tests compare complete web results/menus against the former stable-sort implementation across 96 combinations.

These results show about 90% less query CPU work on web for this workload. They do **not** measure frame rate, browser paint, network latency, memory, battery or field responsiveness. Cache-hit timing is near timer resolution and is not used for a speedup claim.

MapLibre now loads from a separate runtime chunk after page hydration. The initial page chunk has roughly 57% fewer gzip bytes. The renderer is still downloaded for the map (about 277 KB gzip), with a separate self-contained worker, frameworks, CSS and map tiles. This is a reduction in initial page work, not a 57% reduction in total site transfer or measured loading time. The catalog remains embedded in the page. Investigate further splitting only with startup evidence and a reliable offline/loading experience.

## Implementation and correctness

- Web prepares normalized venue and beer search text once per immutable catalog. Index preparation measured 1.04 ms on the reference Mac.
- Each query selects the best matching serving with one scan instead of sorting every menu. Venue result ordering and full-menu/source behavior are preserved, including unknown volume, exact sizes, multipacks, and “from” prices.
- Web reuses currency/collation formatters, memoizes stable list rows and compares marker input identity instead of serializing every menu.
- Deferred map initialization preserves pending list selections and permalinks and provides a quiet failure/retry state. Programmatic venue camera events preserve selection; user zoom still dismisses it. Rendered review exposed repeated selection closing a mobile panel during a camera animation; that interaction was repaired and added to the existing browser regression scenario.

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

From `application/`, build first, then run the built Worker in one terminal and the wrapper in a second:

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

## Counts instead of overlapping web prices — 5 October 2026

### Production comparison and limits

Baseline is **`646362d`**. Both sides use built Worker output and the same **7,440-byte** opt-in diagnostic probe. Runtime: arm64 Mac, macOS 26.5.1, Node 22.22.3, IAB Chromium 154; **390 × 844 CSS pixels, DPR1, CPU4×, 375,000 B/s down, 125,000 B/s up, 150 ms latency, HTTP cache bypassed**. Host/filesystem/GPU state is warm; external tile/CDN caches and GC are uncontrolled. The wrapper buffers/recompresses HTML and is outside the shipped bundle. Hardware model/RAM were not established. These are production host workloads, not physical-iPhone/Safari, cold-CDN, system memory, battery, field-INP or compositor-frame evidence.

Three navigations per source precede interaction. Each interaction cycle performs trusted **Zoom in → settle → Zoom out → settle → canvas ArrowRight → settle → ArrowLeft → settle**, three cycles per source. Settling uses a bounded observer of marker/container style/child writes: 150 ms quiet, four-second deadline. All measured moves settled. This prevents interrupted camera animations from changing endpoints, but does not measure delivered frames. Chrome `Performance.getMetrics` deltas measure renderer main-thread work, not process CPU or GPU/worker time. Fixed animations, automation and the quiet interval remain in wall time.

| Measured endpoint | Before | After grouping |
| --- | ---: | ---: |
| Attached price/count markers, settled overview | 165 | 66 (49 prices, 17 counts) |
| Labels intersecting the viewport/map rectangle | 102 | 13 |
| Intersecting label pairs | 662 | 0 |
| Represented matching venues | 165 | 165 |
| Median cycle TaskDuration | 1,610 ms | **1,052 ms** |
| Median cycle ScriptDuration | 705 ms | 508 ms |
| Median cycle RecalcStyleDuration | 413 ms | 187 ms |
| Median cycle wall time | 2,368 ms | 2,384 ms |
| Median navigation FCP | 1,012 ms | 980 ms |
| Median client-control DOM/second-rAF opportunity | 1,746.4 ms | 1,728.4 ms |
| Median all venues represented DOM/second-rAF opportunity | 2,714.2 ms | 2,709.1 ms |

About **35% less main-thread task work** accompanies the clearer overview; cycle wall time does not improve. Small navigation shifts do not establish startup improvement. `venues-represented` counts individual price/candidate nodes plus each count's actual membership; legacy `prices-attached`/`price-markers` require 165 individual prices and intentionally do not fire for grouped content. No matching new basemap-completion endpoint was captured, so the earlier loading study remains separate. Geometry includes partial-edge labels and closed venues; contextual selected/focused exceptions are outside the unselected non-overlap result. All matching venue IDs remain represented exactly once.

Rounded cycle samples, ms: before Task **1750 / 1610 / 1481**, Script **823 / 705 / 613**, Style **439 / 413 / 413**, wall **2401 / 2367 / 2368**; after Task **1247 / 1052 / 1027**, Script **645 / 508 / 485**, Style **201 / 183 / 187**, wall **2409 / 2384 / 2377**. After layout deltas round to 1–2 ms. Six bounded rAF windows per side have maximum gaps **18.5 → 17.0 ms**, with no gaps over 50 ms on either side. These are scheduling opportunities, not proof of displayed FPS or smoother device frames.

Overview Chrome Nodes **3510 → 3247**; after three cycles, visited individual buttons bring the after count to **3470**. Overview `JSHeapUsedSize` is **19,595,444 / 20,553,048 / 20,837,328 → 22,573,956 / 22,280,344 / 22,653,880 bytes**. After-cycle samples range **29.65–34.45 MB before / 29.47–36.18 MB after**. GC is uncontrolled and snapshots are neither peak nor retained/system memory. The higher overview heap prevents a memory-benefit claim. Cache bounds are explicit: at most one visited individual button per current-catalog venue, only current group membership keys, and no detached full menus. Long-session/physical-memory and leak checks remain separate work.

Ignored evidence: `artifacts/browser-density/2026-10-05/` contains **`matched-before-overview-{1,2,3}` / `matched-before-map-cycles` / `matched-before-map-end`**, compared with **`final-after-overview-{1,2,3}` / `final-after-map-cycles` / `final-after-map-end`**. This after source includes the focus/blur correction. The later narrow resize-only correction has a separate **`validated-source-overview.json`** sanity: all 165 venues, 66 markers, 13 in view, zero pair overlaps, venue DOM/second-rAF **2693.8 ms**, controls **1716.1 ms**, FCP **968 ms**. It is one sanity sample, not a second three-run performance comparison. Its earlier capture/GC state is not pooled with the matched heap snapshots. Preliminary `before`, `after` and `matched-after` series, interrupted-animation runs and stale-build asset failures are excluded from the comparison.

### Implementation, UI and repeatability

`layoutMarkerGroups` uses the real price/count dimensions and deterministic collision merging with weighted centroids. Each merge reduces the group count, so the real 165-venue input is bounded. Runs occur on settled zoom, resize, query/selection changes and coalesced focus departure; there is no per-pan/per-frame grouping. The map stays north-up/flat. Unchanged buttons/groups are retained, removed results and obsolete memberships released, and expanded menus removed when their venue detaches. Counts express venues only, never a minimum, averaged or inferred price. At maximum zoom, the chooser exposes each matching serving and transfers selection/focus to the real venue.

Actual rendered CUA checks cover 390 × 844, 1280 × 900 and 320 × 568; count zoom, keyboard pan/focus, maximum-zoom 1983/Nurme choice, full exact-source menus, empty results, unknown litre prices and menu scroll. Desktop-to-small resize originally dropped ALA's footer to **593 px** against the control's **441 px** top. A one-time existing-panel camera correction on resize now preserves selected venue, all 73 rows and scrollTop**3937** at x47/y80, footer bottom**423**. This correction does not make a separate speed claim. `validated-phone.jpg` and `resize-proof.jpg` are completed screenshots; earlier moving or overlapping captures are superseded.

Repeat the production wrapper commands above with this probe, baseline/current builds and identical browser emulation. Capture three untouched navigations separately, then all four settled movements per cycle. Use Chrome metric deltas and verify geometry/represented IDs before interpreting costs. This diagnostic observer is bounded and not imported into production. The extended `scripts/check-mobile-interactions.mjs` encodes count/chooser/focus/resize regressions; syntax/lint pass and equivalent CUA flows were inspected, but the complete standalone CLI browser suite was not run.

The final production build passes lint/types, **21** unit/API/recovery/layout checks, data/menu/timeline audits and bundled iOS snapshot equality. Five new tests cover collisions/identity, translation/source-order invariance, selected/focused exceptions, zoom/co-located reachability and all real IDs/non-overlap at zoom 10/13/16/19. Hydration output is **909,123 raw / 213,493 gzip bytes** (rebuilt baseline **903,470 / 211,923**), within the existing **1,000,000 / 250,000** gates. Data/source dates and native UI are unchanged. Local validation only; no push, deployment, physical installation or App Store release is inferred.

## Repeatable checks and budgets

Run `npm run perf:query` for the web CPU workload. Run `npm run build` for lint, types, serving/API tests, menu/timeline/data checks and production output. Its postbuild check enforces the initial page JS budget: **1,000,000 raw bytes and 250,000 gzip bytes**. Run `npm run perf:bundle` to inspect an existing build. The budget excludes frameworks, deferred map renderer, worker and tiles; adding routes requires deliberately revisiting the check.

Baseline timings were captured against commit `06c0904`; the web baseline uses the same workload with `queryVenues` rather than the new prepared factory. Machine-load-sensitive query timings are recorded manually, not treated as deterministic CI gates. Aim for p95 query computation below 4 ms on the reference workload; use real browser traces for actual interaction goals.

Ignored local raw measurements/build logs are under `artifacts/performance/`. Keep durable conclusions here rather than relying on ignored artifacts to communicate the result.

## Next profiling priorities

1. Profile browser parsing/hydration and early list/control interactivity, then the remaining map-runtime/worker/glyph waterfall. The 5 October production workload attaches prices/linked menus around 2.70 s, while basemap completion remains 4.27–4.30 s and the control endpoint is about 132–147 ms later than baseline. Isolate those costs before more optimization. Repeat comparable production measurements and actual screens; physical-mobile/Safari and cold-CDN behavior remain gates.
2. Continue the web density workload at intermediate zoom and in long sessions, and measure physical-mobile/Safari frame/memory behavior. The unselected settled overview now groups 165 venues into 66 markers without pair overlaps and has lower renderer main-thread work in the matched host workload. Overview JS heap samples are higher; audit retained objects/GC before claiming a memory benefit. Preserve count meaning, exact serving prices, keyboard focus, full menus, provenance and selected-place context.
3. Audit retained map objects, canceled async loads, cache size, repeated network requests and idle work. Re-run a broader performance trace only for new concerns or meaningful changes, avoiding expensive redundant checks every heartbeat.

Faster queries do not establish visual quality. Review real web interactions as part of each meaningful interface milestone.

Primary guidance: [MapLibre current bundler/worker guidance](https://maplibre.org/maplibre-gl-js/docs/) and [MapLibre large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/).
