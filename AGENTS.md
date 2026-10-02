# Beer Map development

This is the working repository for the Rīgas alus website and native iPhone app. Web source is in `app/`; native source is in `ios/`.

The user requested independent development, thoughtful useful features, competitor research, complementary website improvements, occasional commits, and a background continuation every five hours. Use `DEVELOPMENT.md` for durable progress and priorities. Ask the user only for necessary decisions or concrete blockers.

The user rejected the first native visual design on 2 October 2026 and explicitly requires continuous improvement toward excellent, clean design. The functional baseline is verified; its visual direction is unapproved. Apply the Edvards UI/UX skill and relevant SwiftUI skills. Study real product screens before a substantial redesign. Favor clear hierarchy, disciplined typography and spacing, useful density, coherent navigation and restrained materials. Remove redundant chrome, repeated warnings and decorative containers. Native defaults and a successful build are not evidence of design quality. Explore structurally distinct directions after a rejection; label proposals as provisional until reviewed. Inspect actual rendered screens and fix visible defects before claiming a design milestone is complete. Prioritize clarity and polish over accumulating features.

Apply the same quality bar to website changes. Preserve accepted directions and interaction context, and review real browser states and mobile viewports before declaring polish complete. Current native research and draft decisions are in `docs/design-direction.md`.

The user requires both products to be highly optimized and fast. Treat useful startup time, responsive typing/filtering, smooth scrolling and map pan/zoom, efficient requests/cache behavior, and bounded memory/CPU/battery use as product requirements alongside visual quality. Measure representative production/Release workloads before and after performance changes, keep repeatable checks and budgets, and record the device/runtime and limitations in `docs/performance.md`. Avoid repeated normalization, menu sorting, formatting, decoding or rebuilding unchanged markers on interaction paths. Preserve serving accuracy, provenance, accessibility and accepted design. A synthetic benchmark or successful build alone does not establish device or browser responsiveness.

The user explicitly authorizes updating the existing five-hour scheduled task's prompt and priorities as evidence or project progress warrants, without asking again. Preserve its cadence, background behavior and quiet notification intent, avoid duplicate schedules, and record meaningful revisions.

- Preserve pre-existing user changes and keep commits scoped to completed, verified milestones. Do not include the pre-existing untracked `research/` files by accident.
- Published venue data must have genuine on-premise evidence. Preserve exact beer names, serving sizes, multipacks, “from” prices, source links, and uncertainty. Use the venue-price-research skill when researching new prices.
- `app/catalog.ts` is the app/API projection of the existing website data. Run `npm run sync:ios-data` after changing its input. `npm run check` checks that the bundled snapshot matches.
- Prefer SwiftUI and Apple frameworks for the native app. No embedded website as the app's core interface. Use the installed SDK; don't label an untested OS as verified.
- Verify native UI with the simulator and web UI in a background browser. Build success alone does not prove layout or interactions.
- Hosting is the existing Cloudflare Worker and manbesi.lv. Keep the independent `/p2p/` and status service intact. Read the [official Wrangler skill](https://raw.githubusercontent.com/cloudflare/skills/main/skills/wrangler/SKILL.md) before deployment commands, using a local copy when available. Use project-local Wrangler and the built configuration; check the existing target/configuration and verify live routes afterward.
- Record implementation, local verification, production deployment, device installation, and App Store release separately. Never infer one from another.
