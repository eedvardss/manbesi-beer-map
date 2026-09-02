# Riga venue and beer data

- `riga-venue-points.json` is a deduplicated OpenStreetMap snapshot for Riga relation `13048688`. It includes restaurants, bars, pubs, beer gardens, cafes, nightclubs, fast-food venues, and food courts.
- `beer-prices-*.json` contains row-level menu research. The app imports only batches or records classified as current enough to publish.
- Delivery-platform, retail, stale, ambiguous-currency, and guessed prices must never enter the priced map layer.
- A venue without a qualifying menu remains a neutral map point. It becomes a coloured price marker only after at least one verified beer row is attached.
- The displayed marker price is computed from the cheapest verified beer serving. The expanded marker lists every verified beer row stored for that venue.

Each beer row needs a beer name, numeric EUR price, and a serving volume in millilitres when the source publishes one. Keep the source URL and evidence notes with every research batch.
