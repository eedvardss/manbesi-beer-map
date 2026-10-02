# Native design direction

2 October 2026. The user rejected the first native visual design and requires consistently better, cleaner design. The functional baseline remains verified. Neither that first visual direction nor these new drafts is user-approved.

## What failed in the first pass

The title bar, search and three oversized glass chips consumed too much of the map. Glass appeared on passive counts as well as controls. Saved places repeated the offline state, research date, list count and a warning around a sparse default list. Price and serving hierarchy was weak, and the generic navigation did little to make the product feel deliberate. Passing tests and using standard iOS controls did not settle these design questions.

## References actually inspected

These are observations of published screens and official documentation, not hands-on competitor app testing. Research was refreshed on 2 October 2026.

| Reference | Observed principle | Application here |
| --- | --- | --- |
| [Apple Materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) | Glass belongs to the functional navigation/control layer and should be used sparingly. Content needs a distinct hierarchy. | Solid, legible place and menu surfaces. No glass on passive counts or repeated custom filter pills. |
| [Mapstr iPhone screenshots](https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465) | The map is the dominant surface; map/list switching is compact, and lists organize place information into scannable rows. | A map-first layout with one integrated search/filter control, a useful place panel and small secondary bookmark actions. Do not imitate its dense multicolor pin cloud. |
| [Citymapper iPhone screenshots](https://apps.apple.com/us/app/citymapper-all-live-transit/id469463298) | Numerical comparison values align consistently and routes can be scanned as concise rows; a map supplies context without competing with the list. | A flat comparison direction with an aligned price column, explicit units and a secondary map action. No decorative card grid. |
| [Apple Maps product material](https://www.apple.com/maps/) | Place discovery, place context and directions form a connected journey. | Keep real addresses, complete menus and one dominant walking-directions action together. |

Use the Edvards UI/UX, SwiftUI UI Patterns and Liquid Glass skills. The prototype skill provides structurally distinct alternatives; its usual instruction to skip polish is overridden here by the user's explicit requirement for strong visual quality.

## Three native drafts

The DEBUG-only `ios/BeerMap/DesignPrototype.swift` mounts on the existing app root. It is a throwaway design study, not production-ready route code. All variants use the real bundled catalog and the same in-memory filter/bookmark state. They start with **exact 500 ml** servings so tasting pours do not dominate the first price comparison. Filters can still reveal other sizes; unknown volumes and multipacks retain their original semantics.

- **A — Map.** Full map, one compact floating search/filter control, restrained circle clusters, and a bottom panel with real prices, addresses and serving sizes. Saved places and the full list open within this structure.
- **B — City guide.** Editorial typography and a content-first scrolling layout. A real, derived 500 ml starting price leads beside a small geographic inset; the place list follows. No invented venue photography, reviews, curated awards or ratings.
- **C — Comparison.** A flat list with a strong price column, portion/litre switching and exact serving context. The map is an explicit secondary mode. This structure also fits dark appearance well.

Shared detail emphasizes the real place, price and serving, one walking action, complete menu, and collapsed source information. The price-date disclosure is contextual rather than repeated around every screen.

**Provisional recommendation: A.** It best matches the product's spatial discovery job and keeps practical price comparison one tap away. B has a stronger editorial voice; C is useful as a comparison surface. This recommendation is an implementation judgment, not recorded user approval. Continue refining A independently unless user feedback points elsewhere; do not pause all progress waiting for a design vote. After a direction is reviewed, remove losing variants and rewrite the selected structure into the product with appropriate production behavior and checks.

## Run and compare

With one iPhone simulator booted:

```sh
npm run design:ios -- A
```

The command builds the native app, launches the study, and prints a browser mirror URL. It never opens Xcode or the Simulator desktop window. If multiple simulators are booted, set `BEER_MAP_SIMULATOR_ID` explicitly. Stop the command to clean up its simulator-specific mirror. The compact bottom study switcher cycles A/B/C; its menu changes light/dark appearance and text size. Launch arguments `--design-study --design=B` and `manbesi://design?variant=C` also select a draft. The study is excluded from Release builds. Favorites and filters reset after relaunch and never change product bookmarks or disk cache.

## Map and list coordination — 2 October 2026

Draft A's first panel ranked the whole city while the map could show another area. The current refinement makes its compact panel describe **the visible area**, with an explicit full-list action. The expanded list, saved places and a selected cluster retain their own membership while the map moves. Area emptiness has its own recovery action; an empty search still offers filter recovery. Exact servings, full menus and provenance remain available through the place detail.

Research was refreshed against actual [Mapstr App Store screens](https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465), [Apple's map guidance](https://developer.apple.com/design/human-interface-guidelines/maps) and [Apple Maps' nearby-area interaction](https://support.apple.com/guide/iphone/find-nearby-attractions-restaurants-services-iphbaf51b2c0/27/ios/27). The useful principle is connected geographic context: the map and compact results should describe the same area, controls should remain compact, and a place card should preserve the user's browse position. Mapstr's published screens demonstrate a compact Map/List choice and plain place rows; they do not establish hands-on behavior. Apple's guide is a design reference; the implemented app still uses the installed iOS 26.5 SDK.

Direct pin taps now preserve the current camera when opening and dismissing detail. Programmatic venue links can still center a venue. Search editing reduces the panel footprint to keep geographic context available above the keyboard. Area membership publishes after a settled region/data update and only when the ID set changes; it reuses cached, already ordered results.

This remains a refinement of a **provisional DEBUG draft**. B and C stay available for review. The area panel has not replaced the Release app's navigation. For repeatable review, add `--design-dark` or `--design-light`, and `--design-large-text` (accessibility size 1) to the existing design launch arguments. These overrides belong to the study and do not change system settings.

## Detail and menu refinement — 2 October 2026

Inspected the current [Untappd published iPhone venue screen](https://apps.apple.com/us/app/untappd-find-drinks-you-love/id449141888) in the background browser, including its full-resolution screenshot. Its venue identity, primary action, menu heading/date and subordinate item metadata establish clear levels of information. Our application is a source disclosure beside the selected price and beer-name groups containing the actual published serving options. This is an observation of a published screen, not hands-on competitor testing. Reference capture: `artifacts/menu-refinement/untappd-venue-reference.jpg`.

The provisional shared detail now has a flat address/price/serving/source introduction, one walking action and a complete grouped menu. Each exact published beer name appears once above its serving sizes and aligned prices. Unknown volumes, multipacks, duplicate entries and “from” prices remain distinct servings; nothing is inferred or merged by search normalization. Litre mode adds each known unit price. The count describes servings rather than implying every size is a different beer. The redundant category heading and second MapKit view are removed; the main browse map remains the geographic context.

Source information starts collapsed near the quote, includes the original research date, menu link, uncertainty and separate opening-hours provenance. The draft retains its full-menu behavior regardless of overview search/size filters. This refinement is shared by A/B/C and remains DEBUG-only and unapproved. Release keeps its current detail layout while reusing prepared menu data.

Rendered review on iPhone 17e / iOS 26.5 covers ALA's 73-serving menu in light appearance and the long Tallink title, grouped rows and expanded sources in dark appearance at accessibility size 1. Review exposed that the study's large-text override reached the root panel but not the sheet. Detail and filter sheets now receive it explicitly; the interaction check verifies a real increase in price-text height. Settled disclosure captures show the complete warning without clipping. Final proof is under `artifacts/menu-refinement/final-test-attachments/`. Physical-device and maximum-accessibility-size coverage remain separate work.

## Price and cluster hierarchy — 3 October 2026

Refreshed the actual [Mapstr published map screenshot](https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465) and read [Apple's current map guidance](https://developer.apple.com/design/human-interface-guidelines/maps) in the background browser. Mapstr's pins have a clear boundary against geographic content, but its many colored markers are not the direction for this price-comparison product. Apple recommends muted maps for information-rich annotations, clustering overlaps, distinct selection and adequate contrast. The useful application here is hierarchy: an individual serving's price should lead; a group count should remain readable without competing with it.

Draft A/B's price capsules now use the ink/paper contrast, with neutral outlined cluster circles, restrained shadows and a selection outline. Clusters show member counts, never an inferred cluster price. Their circle collision shape and normal high display priority let MapKit manage crowded views. Light/dark colors use semantic UIKit values, and retained layer borders explicitly resolve again when appearance or contrast changes. Map annotations are clipped to the map surface to avoid bleeding into system/navigation areas.

Rendered proof and interaction results: `artifacts/map-hierarchy/`. Review covers the loaded light overview, a cluster zoom and corresponding area membership, opening/closing a real filtered pin without moving its camera, appearance changes on the retained map, and a dark overview with accessibility-size-1 place rows on iPhone 17e / iOS 26.5. MapKit's accessibility tree can expose clustered child annotations; the regression uses a genuinely single-venue filter for its pin step and checks settled geometry.

This remains a provisional DEBUG study, with A/B/C available. The normal Release palette is preserved. Native map correctness also improves: retained annotations now move when accepted source coordinates change, while unchanged coordinates emit no redundant KVO notifications. Exact quotes, serving labels, source dates and full menus are unchanged.

Remaining observed defect: the existing Release overview badge partly covers Apple Maps attribution. The study keeps attribution above its separate place panel. Correct the Release overlay placement with actual light/dark and smaller-screen review before treating its map layout as polished. Reference: `artifacts/map-hierarchy/release-after-attachments/E237EE00-A6EA-478C-9AE2-F10F9899B4A2.png`.

## Quality gate for future runs

Before calling a UI milestone complete, inspect the actual rendered route/device. Compare the map, useful loaded list, long venue name, detail, saved state, empty state and relevant filter state. Use a smaller iPhone, dark appearance and large text when a change affects layout. Check alignment, information density, tap areas, keyboard behavior, overflow and returning from details without losing context. Wait for map tiles; an empty tile grid is not a finished screenshot. Keep the accent limited to meaningful selection or the dominant action, and prefer quick, restrained transitions.

Reduce unnecessary interface before adding features. Record specific remaining defects and review status. Automated checks verify behavior; they do not prove excellent design.
