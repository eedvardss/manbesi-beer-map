# Beer Map development

This is the working repository for the Rīgas alus website. Web app source is in `application/` (routes and data in `application/app/`); Docker files are in `infrastructure/`, docs in `docs/`, and `playwright/` is reserved for future end-to-end tests. Run npm commands from `application/`. The native iPhone app was removed at the user's request on 9 October 2026; do not recreate it without a new explicit request.

The user requested independent development, thoughtful useful features, competitor research, complementary website improvements and occasional commits. The previous five-hour background continuation was deleted at the user's request; do not recreate it without a new explicit request. Use `docs/DEVELOPMENT.md` for durable progress and priorities. Ask the user only for necessary decisions or concrete blockers.

The user explicitly requires continuous improvement toward excellent, clean design. Apply the Edvards UI/UX skill. Study real product screens before a substantial redesign. Favor clear hierarchy, disciplined typography and spacing, useful density, coherent navigation and restrained materials. Remove redundant chrome, repeated warnings and decorative containers. Framework defaults and a successful build are not evidence of design quality. Explore structurally distinct directions after a rejection; label proposals as provisional until reviewed. Inspect actual rendered screens and fix visible defects before claiming a design milestone is complete. Prioritize clarity and polish over accumulating features.

Preserve accepted directions and interaction context, and review real browser states and mobile viewports before declaring polish complete. Current design research and web map decisions are in `docs/design-direction.md`.

The user requires the website to be highly optimized and fast. Treat useful startup time, responsive typing/filtering, smooth scrolling and map pan/zoom, efficient requests/cache behavior, and bounded memory/CPU/battery use as product requirements alongside visual quality. Measure representative production workloads before and after performance changes, keep repeatable checks and budgets, and record the device/runtime and limitations in `docs/performance.md`. Avoid repeated normalization, menu sorting, formatting, decoding or rebuilding unchanged markers on interaction paths. Preserve serving accuracy, provenance, accessibility and accepted design. A synthetic benchmark or successful build alone does not establish device or browser responsiveness.

The user's later request to remove the scheduled task supersedes the earlier authority to update it. Development work does not authorize another schedule.

- Preserve pre-existing user changes and keep commits scoped to completed, verified milestones. Do not modify or commit changes to the `research/` files by accident.
- Published venue data must have genuine on-premise evidence. Preserve exact beer names, serving sizes, multipacks, “from” prices, source links, and uncertainty. Use the venue-price-research skill when researching new prices.
- `application/app/catalog.ts` is the app/API projection of the existing website data.
- Verify web UI in a background browser. Build success alone does not prove layout or interactions.
- Primary hosting is the dedicated Cloudflare Worker `aluskarte`, attached to aluskarte.lv and www.aluskarte.lv. Keep account-named previews disabled. Preserve the separate legacy manbesi.lv Workers and their independent `/p2p/` and status service. Read the [official Wrangler skill](https://raw.githubusercontent.com/cloudflare/skills/main/skills/wrangler/SKILL.md) before deployment commands, using a local copy when available. Use project-local Wrangler and the built configuration; check the existing target/configuration and verify live routes afterward.
- Record implementation, local verification and production deployment separately. Never infer one from another.
