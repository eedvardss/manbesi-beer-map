import XCTest
@testable import BeerMap

final class BeerMapTests: XCTestCase {
    func testBundledCatalogAndEveryLitreComparison() throws {
        let catalog = try Catalog.bundled()
        XCTAssertEqual(catalog.venues.count, 165)
        XCTAssertEqual(catalog.venues.reduce(0) { $0 + $1.beers.count }, 2550)
        XCTAssertEqual(catalog.checkedAt, "2026-09-04")
        for venue in catalog.venues {
            var filter = VenueFilter()
            filter.sort = .litre
            let result = try XCTUnwrap(VenueQuery.run([venue], filter: filter).first)
            XCTAssertEqual(result.beer.perLitre, venue.beers.compactMap(\.perLitre).min(), venue.name)
        }
    }
    func testSearchBandAndServingUseTheSameBeer() throws {
        let catalog = try Catalog.bundled()
        let ala = try XCTUnwrap(catalog.venues.first { $0.id == "folkklubs-ala-pagrabs" })
        var filter = VenueFilter(query: "IPA", priceBand: .fiveToSix)
        let result = try XCTUnwrap(VenueQuery.run([ala], filter: filter).first)
        XCTAssertEqual(result.beer.price, 5.5)
        XCTAssertEqual(result.beer.volumeMl, 500)
        filter.priceBand = .over6
        XCTAssertEqual(VenueQuery.run([ala], filter: filter).first?.beer.volumeMl, 3000)
        filter = VenueFilter(query: "Brengulu")
        XCTAssertNotNil(VenueQuery.run([ala], filter: filter).first)
        filter.query = "no-such-beer"
        XCTAssertTrue(VenueQuery.run([ala], filter: filter).isEmpty)
    }
    func testHalfLitreAndUnknownSizes() throws {
        let catalog = try Catalog.bundled()
        let results = VenueQuery.run(catalog.venues, filter: VenueFilter(size: .halfLitre))
        XCTAssertFalse(results.isEmpty)
        XCTAssertTrue(results.allSatisfy { $0.beer.volumeMl == 500 && ($0.beer.packageCount ?? 1) == 1 })
        let unknown = Serving(name: "Unknown", volumeMl: nil, price: 1)
        XCTAssertNil(unknown.perLitre)
        XCTAssertFalse(ServingSize.halfLitre.matches(unknown))
        let multipack = Serving(name: "Pack", volumeMl: 500, price: 6, packageCount: 3)
        XCTAssertEqual(multipack.perLitre, 4)
        XCTAssertFalse(ServingSize.halfLitre.matches(multipack))
    }
    func testOpeningHoursOvernightAndUnknownDays() {
        let hours = OpeningHours(week: [["18:00-02:00"], [], [], [], [], [], []], sourceUrl: "https://example.com", checkedAt: "2026-09-04", note: nil)
        XCTAssertEqual(hours.isOpen(day: 0, minutes: 23 * 60), true)
        XCTAssertEqual(hours.isOpen(day: 1, minutes: 60), true)
        XCTAssertEqual(hours.isOpen(day: 1, minutes: 120), false)
        let unknown = OpeningHours(week: [nil, nil, nil, nil, nil, nil, nil], sourceUrl: "https://example.com", checkedAt: "2026-09-04", note: nil)
        XCTAssertNil(unknown.isOpen(day: 1, minutes: 60))
    }
    @MainActor func testCachedQueriesTrackFiltersLocationBookmarksAndClock() throws {
        let store = BeerMapStore(ephemeral: true)
        let index = VenueSearchIndex(store.venues)
        let point = Coordinate(lat: 56.95, lng: 24.11)
        for query in ["", "a", "al", "ALA", "IPA", "Brengulu", "Peldu", "no-such-beer"] {
            for band in PriceBand.allCases {
                for sort in VenueSort.allCases {
                    store.filter = VenueFilter(query: query, priceBand: band, size: .halfLitre, sort: sort)
                    let reference = VenueQuery.run(store.venues, filter: store.filter, location: point, now: store.now)
                    let indexed = VenueQuery.run(store.venues, filter: store.filter, location: point, now: store.now, searchIndex: index)
                    for values in [indexed, store.results(location: point), store.results(location: point)] {
                        XCTAssertEqual(values.map(\.id), reference.map(\.id))
                        XCTAssertEqual(values.map(\.beer), reference.map(\.beer))
                        XCTAssertEqual(values.map(\.distanceMetres), reference.map(\.distanceMetres))
                    }
                }
            }
        }
        store.resetFilters()
        _ = store.results(location: nil)
        XCTAssertNotNil(store.results(location: point).first?.distanceMetres)
        store.toggleSaved("banshee")
        XCTAssertEqual(store.results(location: point, savedOnly: true).map(\.id), ["banshee"])
        store.toggleSaved("banshee")
        XCTAssertTrue(store.results(location: point, savedOnly: true).isEmpty)
        store.filter.openOnly = true
        for clock in ["2026-09-07T10:00:00Z", "2026-09-07T23:00:00Z"] {
            store.now = try XCTUnwrap(ISO8601DateFormatter().date(from: clock))
            let reference = VenueQuery.run(store.venues, filter: store.filter, now: store.now)
            XCTAssertEqual(store.results(location: nil).map(\.id), reference.map(\.id))
        }
    }
    func testDistanceAndFromPrices() {
        let point = Coordinate(lat: 56.95, lng: 24.11)
        XCTAssertEqual(VenueQuery.metres(from: point, to: point), 0)
        XCTAssertEqual(VenueQuery.metres(from: point, to: Coordinate(lat: 56.96, lng: 24.11)), 1111.95, accuracy: 1)
        let beer = Serving(name: "Starting price", volumeMl: 500, price: 5, priceIsFrom: true)
        XCTAssertTrue(beer.priceLabel.hasPrefix("no "))
        XCTAssertTrue(beer.litreLabel.hasPrefix("no "))
    }

    func testMapAreaIncludesEdgesAndHandlesTheDateLine() {
        let riga = VenueMapBounds(south: 56.94, north: 56.96, west: 24.10, east: 24.13)
        XCTAssertTrue(riga.contains(lat: 56.95, lng: 24.11))
        XCTAssertTrue(riga.contains(lat: 56.94, lng: 24.13))
        XCTAssertFalse(riga.contains(lat: 56.97, lng: 24.11))
        XCTAssertFalse(riga.contains(lat: 56.95, lng: 24.14))
        let dateLine = VenueMapBounds(south: -10, north: 10, west: 170, east: -170)
        XCTAssertTrue(dateLine.contains(lat: 0, lng: 179))
        XCTAssertTrue(dateLine.contains(lat: 0, lng: -179))
        XCTAssertFalse(dateLine.contains(lat: 0, lng: 0))
        XCTAssertFalse(dateLine.contains(lat: 11, lng: 179))
    }
    @MainActor func testSavedPlacesPersistAndSharedLinksResolve() throws {
        let suite = "BeerMap.Tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let cache = FileManager.default.temporaryDirectory.appendingPathComponent("nonexistent-\(UUID().uuidString)/catalog.json")
        let store = BeerMapStore(defaults: defaults, cacheURL: cache)
        store.toggleSaved("banshee")
        XCTAssertTrue(BeerMapStore(defaults: defaults, cacheURL: cache).savedIDs.contains("banshee"))
        store.open(URL(string: "manbesi://venue/banshee")!)
        XCTAssertEqual(store.selectedID, "banshee")
        store.open(URL(string: "https://manbesi.lv/?venue=folkklubs-ala-pagrabs")!)
        XCTAssertEqual(store.selectedID, "folkklubs-ala-pagrabs")
        store.open(URL(string: "https://example.com/?venue=banshee")!)
        XCTAssertEqual(store.selectedID, "folkklubs-ala-pagrabs")
    }

    @MainActor func testDesignStudyCannotChangeProductBookmarksOrCache() throws {
        let suite = "BeerMap.DesignTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set(["banshee"], forKey: "savedVenueIDs")
        let cache = FileManager.default.temporaryDirectory.appendingPathComponent("design-cache-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: cache) }
        let bundled = try Catalog.bundled()
        let scratch = Catalog(schemaVersion: 1, city: bundled.city, currency: "EUR", checkedAt: "2099-01-01", venues: [bundled.venues[0]])
        let originalCache = try JSONEncoder().encode(scratch)
        try originalCache.write(to: cache)
        let study = BeerMapStore(defaults: defaults, cacheURL: cache, ephemeral: true)
        XCTAssertTrue(study.savedIDs.isEmpty)
        XCTAssertEqual(study.venues.count, bundled.venues.count)
        study.toggleSaved("piga-avotu")
        XCTAssertTrue(study.savedIDs.contains("piga-avotu"))
        XCTAssertEqual(defaults.stringArray(forKey: "savedVenueIDs"), ["banshee"])
        XCTAssertEqual(try Data(contentsOf: cache), originalCache)
        XCTAssertTrue(BeerMapStore(defaults: defaults, cacheURL: cache, ephemeral: true).savedIDs.isEmpty)
    }

    @MainActor func testRefreshCachesValidDataAndKeepsItOnFailure() async throws {
        let suite = "BeerMap.RefreshTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("catalog-test-\(UUID().uuidString)")
        let cache = directory.appendingPathComponent("catalog.json")
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = BeerMapStore(defaults: defaults, cacheURL: cache)
        store.toggleSaved("banshee")
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [CatalogProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        CatalogProtocol.status = 200
        let bundled = try Catalog.bundled()
        _ = store.results(location: nil) // Populate the previous catalog's cache.
        let changed = Catalog(schemaVersion: 1, city: bundled.city, currency: "EUR", checkedAt: bundled.checkedAt, venues: [bundled.venues.last!])
        CatalogProtocol.body = try JSONEncoder().encode(changed)
        await store.refresh(session: session)
        XCTAssertNil(store.errorMessage)
        XCTAssertTrue(FileManager.default.fileExists(atPath: cache.path))
        XCTAssertEqual(store.results(location: nil).map(\.id), changed.venues.map(\.id))
        store.filter.query = changed.venues[0].name
        XCTAssertEqual(store.results(location: nil).first?.id, changed.venues[0].id)
        CatalogProtocol.status = 503
        await store.refresh(session: session)
        XCTAssertTrue(store.usesOfflineCatalog)
        XCTAssertFalse(store.venues.isEmpty)
        XCTAssertTrue(store.savedIDs.contains("banshee"))
        XCTAssertNotNil(store.errorMessage)
        CatalogProtocol.status = 200
        CatalogProtocol.body = Data("{\"schemaVersion\":999}".utf8)
        await store.refresh(session: session)
        XCTAssertEqual(store.catalog?.schemaVersion, 1)
        XCTAssertEqual(try CatalogCacheRecord.read(from: cache).catalog.schemaVersion, 1)
    }
}

private final class CatalogProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var status = 200
    nonisolated(unsafe) static var body = Data()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let response = HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Self.body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
