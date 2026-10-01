# Beer Map competitor research

Reviewed 2 October 2026. These are product observations from each competitor's own material; marketing claims are not independent measurements.

| Product | Observed strengths | Decision for Rīgas alus |
| --- | --- | --- |
| [VadKostarÖlen](https://vadkostarolen.se/faq) | Price map, time-based happy hours, price/distance filters, account-free browsing. Prices collected from visits/calls and reviewed reports. Standard serving sizes matter to their comparisons. | Make price and actual serving size immediately visible. Offer an exact 500 ml filter and litre comparison. Keep browsing account-free. Only add happy hours when time-specific evidence exists. |
| [Untappd Find It](https://help.untappd.com/hc/en-us/articles/360040808131--How-to-use-the-Find-It-feature) | Search for a particular beer near a location; distinguishes venue menus from recent check-in evidence. [Guest browsing](https://help.untappd.com/hc/en-us/articles/14811149192596-New-Registration-Free-Experience-on-Untappd) includes menus, venues and search. | Search across every recorded beer, not just a venue's cheapest item. Preserve source links and research dates. Saved places should work locally without registration. |
| [Beer Buddy](https://beerbuddy.app/) | Focuses on meeting in person, maps and social coordination; supports alcohol-free socializing. | Add easy place sharing and walking directions. Favor practical discovery and include the dataset's alcohol-free options without assuming everybody wants alcohol. |

## Design and first milestone

The primary job is to find a suitable Riga place at an understandable price. Use three native tabs: Map, Places, Saved. MapKit clusters keep the overview readable. Neutral system surfaces, a restrained amber accent, native typography, Liquid Glass controls, and a venue sheet keep the hierarchy simple. Full menus and provenance appear in the sheet; the map needs only a price or a cluster count.

The app ships the exact website catalog for offline browsing, then refreshes through a versioned public API. A fetch date does not imply that menu evidence was rechecked. Location is requested only after tapping the location action and stays on the device.

Installed tools: Xcode 26.6, Swift 6.3.3, iOS SDK 26.5. Deployment target: iOS 26.0; no iOS 27-only APIs. Apple's [SDK requirements](https://developer.apple.com/xcode/system-requirements/) list a newer iOS 27 toolchain, but it is not installed here. Native standard controls follow Apple's [Liquid Glass guidance](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass).

## Useful next milestones

1. Verify light/dark mode, large text, small iPhones, offline refresh, and denied location access.
2. Bring saved places, shareable links, and serving-size filters to the website where appropriate.
3. Improve source freshness per venue instead of relying on a global research date.
4. Add evidenced happy-hour intervals and reviewed price correction submissions.
5. Prepare TestFlight distribution once signing access is available.
