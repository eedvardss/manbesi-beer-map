# Riga venue and beer data

- `riga-venue-points.json` is a deduplicated OpenStreetMap snapshot for Riga relation `13048688`. It includes restaurants, bars, pubs, beer gardens, cafes, nightclubs, fast-food venues, and food courts.
- `beer-prices-*.json` contains row-level menu research. The app imports only batches or records classified as current enough to publish.
- Delivery-platform, retail, stale, ambiguous-currency, and guessed prices must never enter the priced map layer.
- The visible map is for drinking venues: bars, pubs, beer gardens, taprooms, nightclubs, and clearly beer-led bar concepts. Ordinary restaurants and cafes stay out even when their menus include beer. Every verified Ezītis location is eligible regardless of its OpenStreetMap category.
- A venue without a qualifying menu remains in the research inventory but is omitted from the visible map and list. It becomes visible as a coloured price marker only after at least one verified beer row is attached.
- The displayed marker price is computed from the cheapest verified beer serving. The expanded marker lists every verified beer row stored for that venue.

Each beer row needs a beer name, numeric EUR price, and a serving volume in millilitres when the source publishes one. Keep the source URL and evidence notes with every research batch.

## Serving-size completeness

Include every source-verified beer-and-serving combination, regardless of size: small glasses, standard pours, large mugs, jugs, pitchers, and towers. Never omit a row merely because its serving is large or shared. Transcribe separately printed prices; do not invent prices by scaling another size. Keep any calculated comparison separate from the published price. When auditing a menu, inspect every size column before describing its beer list as complete.

## Price identity and comparisons

Preserve source distinctions such as draught versus bottled beer in the serving name. Rechecked on 2026-09-04: Bon-Vivant and Duvel’s both list Karmeliet 330 ml at €7 draught and €6.50 bottled; both are valid and explicitly labelled. Never resolve such differences by silently choosing the cheaper price.

A serving identity includes its name, volume, package count, and whether the price is a “from” price. The publication audit rejects different prices for the same identity. Exact duplicates may be collapsed. Research inventory not used on the map can retain unresolved observations, but they must pass validation before publication.

Search and price filters apply to the same beer rows. A venue-name/address match searches all its servings; a beer-name match searches the matching beers. “Lētākais litrs” selects the lowest verified unit price across matching servings, including jugs and multipacks, and displays the selected serving. Unknown sizes remain available with their published price and an unavailable unit comparison. Clear filters to see the full menu.
