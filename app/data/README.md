# Riga venue and beer data

- `riga-venue-points.json` is a deduplicated OpenStreetMap snapshot for Riga relation `13048688`. It includes restaurants, bars, pubs, beer gardens, cafes, nightclubs, fast-food venues, and food courts.
- `beer-prices-*.json` contains row-level menu research. The app imports only batches or records classified as current enough to publish.
- Delivery-platform, retail, stale, ambiguous-currency, and guessed prices must never enter the priced map layer.
- The visible map is for drinking venues: bars, pubs, beer gardens, taprooms, nightclubs, and clearly beer-led bar concepts. Ordinary restaurants and cafes stay out even when their menus include beer. Every verified Ezītis location is eligible regardless of its OpenStreetMap category.
- A venue without a qualifying menu remains in the research inventory but is omitted from the visible map and list. It becomes visible as a coloured price marker only after at least one verified beer row is attached.
- The displayed marker price is computed from the cheapest verified beer serving. The expanded marker lists every verified beer row stored for that venue.

Each beer row needs a beer name, numeric EUR price, and a serving volume in millilitres when the source publishes one. Keep the source URL and evidence notes with every research batch.
