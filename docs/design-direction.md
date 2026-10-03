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

The Release attribution overlap observed in this pass is corrected in the following scoped layout work; it does not settle the unapproved overall design.

## Attribution and accessible controls — 3 October 2026

Read [Apple's current map guidance](https://developer.apple.com/design/human-interface-guidelines/maps) again and reproduced the Release badge covering the logo/legal link in an actual native frame. Apple's useful principle is to keep attribution anchored to the map and separate it from custom controls. The product now gives status and location their own flat row below the canvas, with MapKit retaining its native attribution. This removes glass from a passive count and avoids manual positioning of private MapKit subviews.

The native quick-filter strip now grows to its content height. The largest accessibility category keeps the map visible and lets people scroll to and select exact 500 ml. Loaded light/dark and largest-text captures on iPhone 17e / iOS 26.5 verify the layout; source status wraps and legal content has about ten points of clearance above the separate row. The original layout and final proof are in `artifacts/map-attribution/`. The correction affects the existing product; A/B/C and the complete visual direction remain provisional and unapproved. Remaining large-text menu/list/keyboard and denied-location states need their own review.

## Quality gate for future runs

Before calling a UI milestone complete, inspect the actual rendered route/device. Compare the map, useful loaded list, long venue name, detail, saved state, empty state and relevant filter state. Use a smaller iPhone, dark appearance and large text when a change affects layout. Check alignment, information density, tap areas, keyboard behavior, overflow and returning from details without losing context. Wait for map tiles; an empty tile grid is not a finished screenshot. Keep the accent limited to meaningful selection or the dominant action, and prefer quick, restrained transitions.

Reduce unnecessary interface before adding features. Record specific remaining defects and review status. Automated checks verify behavior; they do not prove excellent design.


## Location access without persistent warnings — 3 October 2026

Read Apple's current [privacy guidance](https://developer.apple.com/design/human-interface-guidelines/privacy), [alert guidance](https://developer.apple.com/design/human-interface-guidelines/alerts) and [one-shot location documentation](https://developer.apple.com/documentation/corelocation/cllocationmanager/requestlocation()) in the background browser. The useful principle is context: optional location access belongs to the action that needs it, and an actionable failure should not become permanent browse chrome. Declining permission must leave the map useful.

A real system-prompt denial followed by a fresh launch reproduced the existing unsolicited warning. At the largest accessibility category on iPhone 17e / iOS 26.5, the warning consumed most of the screen and reduced the map to 24 points high. The product now stays quiet after denial and at startup. A subsequent explicit location request offers brief recovery in the initiating map control or filter sheet. Dismissal preserves the map frame and filters. Feedback no longer repeats above places or inside the status row.

The first recovery copy also overflowed the alert's text region at maximum text. Shorter copy now displays the full explanation above both actionable buttons; rendered review and geometry checks verify it in light/dark and the largest category. The denied map retains 454 points of canvas at ordinary text and 236.3 points at the largest category, with visible native attribution. Real exact-500-ml selection still changes 165 places to 131. Proof: `artifacts/location-access/`.

Restricted access has a separate explanation without a misleading permission-settings action. Transient failures offer retry. Those branches and authorization revocation are checked with a controlled system boundary, not by changing a real device's privacy settings. Only the denied branch currently has rendered recovery coverage.

**Settings destination limitation:** [Apple's supported app Settings URL](https://developer.apple.com/documentation/uikit/uiapplication/opensettingsurlstring) launches Settings in this Simulator, but consistently lands at its root. App-specific navigation and re-enabling access are unverified. Direct UIKit opening, ad hoc Simulator signing and a temporary Settings-bundle hypothesis did not change that destination; the unused bundle was removed. Keep the supported API and verify the actual destination on a signed physical-device build when available. Do not equate Settings launching with successful permission recovery.

This is a correction to the functional product, with shared filter behavior in the study. The full design and A/B/C remain provisional and unapproved. Online captions, other maximum-text screens and a physical-device location journey remain separate review work.


## Maximum-text detail and menu review — 3 October 2026

Rendered maximum-text review exposed split menu headings, serving units wrapping under narrow price columns, oversized walking controls and an unscaled product quote. The product's initial 350-point sheet showed only part of its identity at this size. The useful principle in [Apple's Dynamic Type walkthrough](https://developer.apple.com/videos/play/wwdc2024/10074/) is to adapt the layout as text grows: give related values the available width, retain their hierarchy and allow vertical scrolling. Semantic fonts scale automatically; the custom product quote now uses `ScaledMetric`.

Both detail implementations stack their heading/count, primary/secondary actions and exact serving values at accessibility sizes. Ordinary text keeps compact columns. The accessibility walking control uses a complete text label; extra decorative symbols no longer consume its width. The product opens venue detail at the large detent for accessibility text. Menu counts describe published portions. The prepared menu retains every original serving, including unknown sizes, multipacks, duplicates and “from” labels. Combined product row accessibility includes the exact values and only known litre prices.

The draft review menu now includes **Maksimāls teksts**, also available as `--design-max-text` (accessibility size 5). Root, detail and filter sheets receive the same explicit review size. A/B/C remain provisional; this scoped correction does not record user approval or promote a complete draft into Release.

Actual review covers the smaller iPhone 17e / iOS 26.5 Simulator (390 × 844 points): ordinary light product/detail menu, the light grouped draft, dark accessibility-size-1 long-title/menu/source, and dark maximum-text draft/product detail. Exact-value checks cover ALA's 73-serving full menu, its 3000 ml / 18.90 EUR published serving, Cabo's 6 × 330 ml / 22.50 EUR quote, and The Snuggest's unknown-volume servings and expanded original source date. Closing detail returns to the same filtered venue. `DetailLayoutUITests` uses the scroll view's intersection with screen bounds; a hittable element outside the visible sheet is insufficient proof. Final Debug/Release screenshots and geometry are in `artifacts/detail-accessibility/`.

Physical-device rendering, live VoiceOver, the other drafts' maximum-text overview/keyboard extremes and production-browser performance remain separate gates. No website or catalog data changed in this pass.


## Maximum-text overview and active search — 3 October 2026

Reviewed [Apple's actual Contacts example in the Dynamic Type walkthrough](https://developer.apple.com/videos/play/wwdc2024/10074/) again. Its useful principle is to change the layout as text grows: stack related information into the available width, keep supporting icons bounded and give functional text priority over decoration. The product's search presentation uses Apple's documented [search activation binding](https://developer.apple.com/documentation/swiftui/managing-search-interface-activation) to reserve room for results while editing.

Rendered baseline on the smaller iPhone 17e / iOS 26.5 at the maximum category showed narrow name/price columns, oversized icons and keyboard-covered results. Draft C had a zero-height result viewport. Accessible result rows now stack exact serving/price information; ordinary text keeps aligned trailing prices. Product quick filters yield space during accessible active search, with the full filter sheet available from the toolbar. The repeated offline banner is removed; the checked date and source uncertainty remain in their relevant footer/detail/source context. Bookmark targets are 44 points even though their symbol remains 20 points.

A's accessible header separates its summary from actions, and its list height preserves map attribution. B removes the editorial feature during search and gives the large-text featured map its own width. Its top safe-area background stops scrolled text entering the status region. C's comparison labels retain their full words in a horizontally scrolling strip; each large-text quote includes its unit. Result content is clipped with clearance beneath that strip, including after switching to litre comparison. The small study switcher yields to the keyboard and returns when editing ends.

| Captured maximum-text layout | Baseline | Corrected |
| --- | ---: | ---: |
| A map height with keyboard | 79 pt | 161.7 pt |
| A Tallink name width / height | 137.7 / 348.7 pt | 283.3 / 174.7 pt |
| Product Snuggest name width / height | 147.3 / 290.7 pt | 268.3 / 174.7 pt |

Actual review covers A/C maximum dark, B maximum light, all three ordinary-light draft rows, and ordinary-light/maximum-dark product list, keyboard, saved, unknown-size and multipack states. Real interactions verify detail return, full quotes above bottom controls and the original 500 ml / 6.00 EUR serving with its known 12.00 EUR/l value. Final draft proof is `artifacts/overview-accessibility/final-draft-attachments/`; optimized product proof is `release-product-attachments/`. Baseline and earlier passing checks are retained separately. Automated geometry uses the visible app/scroll intersection and active keyboard area, then actual screenshots are inspected.

These draft adjustments remain DEBUG-only and provisional. The product list corrections are verified in optimized Release; the full native direction remains unapproved. A filtered pin can still sit partly under the floating search field at maximum text and needs a separate map/camera composition review. Dense map states, live VoiceOver and physical-device rendering remain open. This layout work does not establish startup, frame-rate or battery performance.
