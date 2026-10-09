# Design direction

The user requires consistently better, cleaner design. The native iPhone app and its design drafts were removed on 9 October 2026; this file keeps the web design decisions.

## Quality gate for future runs

Before calling a UI milestone complete, inspect the actual rendered route in a real browser. Compare the map, useful loaded list, long venue name, detail, saved state, empty state and relevant filter state. Use a small mobile viewport, dark appearance and large text when a change affects layout. Check alignment, information density, tap areas, keyboard behavior, overflow and returning from details without losing context. Wait for map tiles; an empty tile grid is not a finished screenshot. Keep the accent limited to meaningful selection or the dominant action, and prefer quick, restrained transitions.

Reduce unnecessary interface before adding features. Record specific remaining defects and review status. Automated checks verify behavior; they do not prove excellent design.

## Web grouping rejected — 7 October 2026

The user explicitly rejected venue grouping. Restore individual price markers at every zoom, including co-located venues. Preserve complete menus, filters, keyboard focus, selected-place context and the mobile resize fix. Do not reintroduce count markers without a new user request. The following grouping research and results are historical, superseded by this decision.

## Complementary web map density — 5 October 2026

Refreshed actual first-party [Mapstr App Store map/filter/list screenshots](https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465) in the background browser. Its map stays dominant, with a compact Map/List switch and purposeful filter disclosure. Its busy colored pin cloud is not adopted as a readability reference. The useful principle for the existing web direction is to preserve geographic context and useful controls while simplifying annotation density.

[MapLibre's official retained HTML cluster example](https://maplibre.org/maplibre-gl-js/docs/examples/display-html-clusters-with-custom-properties/) demonstrates reusing markers and representing groups separately; [Apple's MapKit annotation documentation](https://developer.apple.com/documentation/mapkit/mapkit-annotations) likewise supports clustering overlapping annotations. Our product-specific application uses actual capsule collisions, neutral **venue counts** and exact individual prices. Geometry is recalculated after settled zoom/resize/filter/selection changes, rather than adopting the example's per-move source update. This keeps grouping independent of tile loading and avoids running it on every pan frame.

The inspected 390 × 844 overview had 102 in-view price labels and 662 intersecting pairs. The completed grouped overview has 13 in-view labels, zero pairs, 66 attached markers and all 165 venues represented. Counts zoom toward members; co-located venues remain reachable through a compact chooser at maximum zoom. Selected and keyboard-focused places stay explicit, with focus transferred from counts to actual members and recovered on Escape/collapse. Existing web price colors, dark palette, filters, timeline and full-source menu structure are retained.

Actual phone/desktop/small-screen checks preserve exact servings and unknown litre semantics. Resizing an already-open ALA menu from desktop to 320 × 568 now preserves all 73 rows, the selected place, scrollTop3937 and source links above the bottom controls. Completed screenshots and geometry are under ignored `artifacts/browser-density/2026-10-05/`; measured costs and their limits are in `performance.md`. This is a scoped, agent-reviewed web clarity improvement, not user approval of a new visual direction.
