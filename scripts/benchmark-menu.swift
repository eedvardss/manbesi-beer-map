import Foundation

// Optimized model workload, not a frame-rate or device responsiveness test.
// Baseline reproduces prior sorting/formatting; after uses the real store cache.
@main struct MenuBenchmark {
    @MainActor static func main() throws {
        let path = CommandLine.arguments[1]
        let suite = "BeerMap.MenuBenchmark.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = BeerMapStore(defaults: defaults, cacheURL: URL(fileURLWithPath: path))
        let ids = ["folkklubs-ala-pagrabs", "banshee", "tallink-riga-lobby-bar"]
        var output: [[String: Any]] = []
        for id in ids {
            let venue = store.venues.first { $0.id == id }!
            for sort in [VenueSort.price, .litre] {
                store.filter.sort = sort
                var checksums = [Int]()
                for mode in ["baseline", "prepared"] {
                    var samples = [Double]()
                    var checksum = 0
                    for batch in 0..<45 {
                        let start = ProcessInfo.processInfo.systemUptime
                        for _ in 0..<50 {
                            if mode == "baseline" {
                                let rows = venue.beers.sorted { VenueQuery.precedes($0, $1, sort: sort) }
                                for beer in rows {
                                    checksum += beer.name.count + beer.volumeLabel.count + beer.priceLabel.count
                                    if beer.perLitre != nil { checksum += beer.litreLabel.count }
                                }
                            } else {
                                for row in store.menu(for: venue).servings {
                                    checksum += row.serving.name.count + row.volumeLabel.count + row.priceLabel.count
                                    checksum += row.litreLabel?.count ?? 0
                                }
                            }
                        }
                        let ms = (ProcessInfo.processInfo.systemUptime - start) * 1000 / 50
                        if batch >= 5 { samples.append(ms) }
                    }
                    checksums.append(checksum)
                    samples.sort()
                    output.append(["venue": id, "servings": venue.beers.count, "sort": sort.rawValue,
                                   "mode": mode, "medianMs": samples[samples.count / 2], "p95Ms": samples[Int(Double(samples.count - 1) * 0.95)],
                                   "checksum": checksum])
                }
                precondition(checksums[0] == checksums[1])
            }
        }
        let data = try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys])
        print(String(decoding: data, as: UTF8.self))
    }
}
