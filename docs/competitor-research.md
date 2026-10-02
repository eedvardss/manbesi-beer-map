# Beer Map competitor research

Reviewed 2 October 2026. These are product observations from each competitor's own material; marketing claims are not independent measurements.

| Product | Observed strengths | Decision for Rīgas alus |
| --- | --- | --- |
| [VadKostarÖlen](https://vadkostarolen.se/faq) | Price map, time-based happy hours, price/distance filters, account-free browsing. Prices collected from visits/calls and reviewed reports. Standard serving sizes matter to their comparisons. | Make price and actual serving size immediately visible. Offer an exact 500 ml filter and litre comparison. Keep browsing account-free. Only add happy hours when time-specific evidence exists. |
| [Untappd Find It](https://help.untappd.com/hc/en-us/articles/360040808131--How-to-use-the-Find-It-feature) | Search for a particular beer near a location; distinguishes venue menus from recent check-in evidence. [Guest browsing](https://help.untappd.com/hc/en-us/articles/14811149192596-New-Registration-Free-Experience-on-Untappd) includes menus, venues and search. | Search across every recorded beer, not just a venue's cheapest item. Preserve source links and research dates. Saved places should work locally without registration. |
| [Beer Buddy](https://beerbuddy.app/) | Focuses on meeting in person, maps and social coordination; supports alcohol-free socializing. | Add easy place sharing and walking directions. Favor practical discovery and include the dataset's alcohol-free options without assuming everybody wants alcohol. |

## Design and first milestone

The primary job is to find a suitable Riga place at an understandable price. The first implementation used Map, Places and Saved tabs with MapKit clusters. The user rejected its visual execution on 2 October 2026: standard controls and a restrained color alone did not produce a strong design. Do not treat that first direction as accepted. See [design-direction.md](design-direction.md) for fresh visual research, three structurally distinct native drafts and their explicitly provisional status. Full menus and provenance remain essential; the overview needs clear price/serving context without excessive chrome.

The app ships the exact website catalog for offline browsing, then refreshes through a versioned public API. A fetch date does not imply that menu evidence was rechecked. Location is requested only after tapping the location action and stays on the device.

Installed tools: Xcode 26.6, Swift 6.3.3, iOS SDK 26.5. Deployment target: iOS 26.0; no iOS 27-only APIs. Apple's [SDK requirements](https://developer.apple.com/xcode/system-requirements/) list a newer iOS 27 toolchain, but it is not installed here. Native standard controls follow Apple's [Liquid Glass guidance](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass).

## Useful next milestones

1. Resolve the rejected visual design first, with rendered comparison of distinct layouts; then extend native appearance, large-text, smaller-iPhone and denied-location coverage.
2. Bring saved places, shareable links, and serving-size filters to the website where appropriate.
3. Improve source freshness per venue instead of relying on a global research date.
4. Add evidenced happy-hour intervals and reviewed price correction submissions.
5. Prepare TestFlight distribution once signing access is available.
