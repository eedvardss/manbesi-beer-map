import Foundation

// Compile with swiftc -O with Models.swift, CatalogRepository.swift and BeerMapStore.swift.
// Measures the actual model on this Mac; it is not device startup or FPS.
@main struct QueryBenchmark {
    @MainActor static func main() throws {
        let catalogURL = URL(fileURLWithPath: CommandLine.arguments[1])
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: catalogURL)).validated()
        let suite = "BeerMap.Benchmark.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = BeerMapStore(defaults: defaults, cacheURL: catalogURL)
        let searches = ["", "a", "al", "ala", "IPA", "Brengulu", "Peldu", "no-such-beer"]
        let bands = PriceBand.allCases
        let sorts: [VenueSort] = [.price, .litre, .name]
        var checksum = 0.0
        func batch(_ iteration: Int) {
            for i in searches.indices {
                store.filter = VenueFilter(query: searches[i], priceBand: bands[(iteration + i) % bands.count], sort: sorts[(iteration + i) % sorts.count])
                let values = store.results(location: nil)
                checksum += Double(values.count) + (values.first?.beer.price ?? 0)
            }
        }
        for i in 0..<5 { batch(i) }
        var samples = [Double]()
        for i in 0..<40 {
            let start = Date.timeIntervalSinceReferenceDate
            batch(i)
            samples.append((Date.timeIntervalSinceReferenceDate - start) * 1000 / Double(searches.count))
        }
        samples.sort()
        store.filter = VenueFilter(query: "IPA", priceBand: .fiveToSix)
        _ = store.results(location: nil)
        let repeatStart = Date.timeIntervalSinceReferenceDate
        for _ in 0..<100 { checksum += Double(store.results(location: nil).count) }
        let repeatedMs = (Date.timeIntervalSinceReferenceDate - repeatStart) * 10
        let output: [String: Any] = ["workload": "\(catalog.venues.count) venues / \(catalog.venues.reduce(0) { $0 + $1.beers.count }) servings, mixed search/band/sort", "queries": 320, "medianMs": samples[20], "p95Ms": samples[38], "repeatedQueryMeanMs": repeatedMs, "checksum": checksum]
        print(String(data: try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys]), encoding: .utf8)!)
    }
}
