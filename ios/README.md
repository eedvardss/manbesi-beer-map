# Rīgas alus for iPhone

A native SwiftUI + MapKit app, with no third-party iOS dependencies. iOS 26.0 and later; currently built using Xcode 26.6 / iOS SDK 26.5. An iOS 27 simulator is not installed, so that OS is not yet verified.

The first visual pass was rejected. Three new, deliberately different native design drafts are available with `npm run design:ios -- A` from the repository root when an iPhone simulator is booted. The command prints a background browser mirror URL; use the bottom draft switcher to compare A/B/C. These drafts use real catalog data and in-memory bookmarks, are excluded from Release, and remain provisional. See [the design direction](../docs/design-direction.md) for research and review status.

Open `BeerMap.xcodeproj` in Xcode, select the BeerMap scheme and an iPhone simulator, and run. The project automatically discovers Swift sources and resources. The bundled catalog works immediately; a normal launch refreshes from `https://manbesi.lv/api/venues`.

```sh
# From the repository root, after changing website data:
npm run sync:ios-data

# Simulator build, no signing account needed:
xcodebuild -project ios/BeerMap.xcodeproj -scheme BeerMap \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build

# Unit and interaction tests (choose an installed simulator):
xcodebuild -project ios/BeerMap.xcodeproj -scheme BeerMap \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' \
  -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO test
```

The app includes clustered map pins, bar/beer/street search, price and exact-size filters, litre comparison, sourced opening-hour filtering, local bookmarks, Apple Maps walking directions, place sharing, source links and dates, and offline catalog fallback. An empty opening-hour day means closed; a missing day means unknown. “From” prices and multipacks remain distinct.

Launch with `--offline` to skip API refresh while reviewing the bundled data. `--uitesting` uses a separate bookmarks namespace and clears that namespace for deterministic UI tests. Those arguments do not disconnect MapKit from its map tile service.

Location access is requested only when the location action is tapped. The app performs distance calculations on the device and sends no location, bookmark, or analytics payload to the catalog API. App privacy manifest covers local UserDefaults use.

For installation on a real phone or TestFlight, select an authorized Apple development team in Xcode and use its signing/distribution workflow. This repository does not contain a registered App Store record or signing credentials.

`scripts/generate-ios-project.py` reproduces the initial Xcode project if needed. Normal edits do not require regenerating it.
