# Beer Map development

This is the working repository for the Rīgas alus website and native iPhone app. Web source is in `app/`; native source is in `ios/`.

The user requested independent development, thoughtful useful features, competitor research, complementary website improvements, occasional commits, and a background continuation every five hours. Use `DEVELOPMENT.md` for durable progress and priorities. Ask the user only for necessary decisions or concrete blockers.

- Preserve pre-existing user changes and keep commits scoped to completed, verified milestones. Do not include the pre-existing untracked `research/` files by accident.
- Published venue data must have genuine on-premise evidence. Preserve exact beer names, serving sizes, multipacks, “from” prices, source links, and uncertainty. Use the venue-price-research skill when researching new prices.
- `app/catalog.ts` is the app/API projection of the existing website data. Run `npm run sync:ios-data` after changing its input. `npm run check` checks that the bundled snapshot matches.
- Prefer SwiftUI and Apple frameworks for the native app. No embedded website as the app's core interface. Use the installed SDK; don't label an untested OS as verified.
- Verify native UI with the simulator and web UI in a background browser. Build success alone does not prove layout or interactions.
- Hosting is the existing Cloudflare Worker and manbesi.lv. Keep the independent `/p2p/` and status service intact. Read the Wrangler skill before deployment commands.
- Record implementation, local verification, production deployment, device installation, and App Store release separately. Never infer one from another.
