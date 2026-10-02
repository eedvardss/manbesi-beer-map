#!/usr/bin/env bash
# Native throwaway design study, with a background browser mirror.
set -euo pipefail

BEER_MAP_VARIANT="${1:-A}"
case "$BEER_MAP_VARIANT" in A|B|C) ;; *) printf 'Choose design A, B, or C.\n' >&2; exit 2 ;; esac
BEER_MAP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${BEER_MAP_SIMULATOR_ID:-}" ]]; then
  BEER_MAP_SIMULATOR_ID="$(xcrun simctl list devices booted -j | node --input-type=module -e '
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const phones = Object.values(JSON.parse(input).devices).flat().filter(d => d.isAvailable && d.state === "Booted" && d.name.startsWith("iPhone"));
    if (phones.length !== 1) {
      process.stderr.write("Set BEER_MAP_SIMULATOR_ID to the iPhone simulator to preview.\n");
      process.exit(2);
    }
    process.stdout.write(phones[0].udid);
  ')"
fi

xcodebuild -project "$BEER_MAP_ROOT/ios/BeerMap.xcodeproj" -scheme BeerMap \
  -destination "platform=iOS Simulator,id=$BEER_MAP_SIMULATOR_ID" \
  -derivedDataPath "$BEER_MAP_ROOT/ios/build" CODE_SIGNING_ALLOWED=NO -quiet build
xcrun simctl install "$BEER_MAP_SIMULATOR_ID" "$BEER_MAP_ROOT/ios/build/Build/Products/Debug-iphonesimulator/BeerMap.app"
xcrun simctl terminate "$BEER_MAP_SIMULATOR_ID" lv.manbesi.BeerMap >/dev/null 2>&1 || true
xcrun simctl launch "$BEER_MAP_SIMULATOR_ID" lv.manbesi.BeerMap --design-study "--design=$BEER_MAP_VARIANT"

cleanup_beer_map_mirror() {
  npx --yes serve-sim@latest --kill "$BEER_MAP_SIMULATOR_ID" >/dev/null 2>&1 || true
}
trap cleanup_beer_map_mirror EXIT INT TERM HUP
cleanup_beer_map_mirror
npx --yes serve-sim@latest "$BEER_MAP_SIMULATOR_ID"
