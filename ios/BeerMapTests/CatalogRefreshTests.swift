import Observation
import Synchronization
import XCTest
@testable import BeerMap

final class CatalogRefreshTests: XCTestCase {
    @MainActor func testNotModifiedPreservesCatalogQueriesInteractionAndDisk() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let store = fixture.makeStore()
        let data = try JSONEncoder().encode(Catalog.bundled())
        RefreshTestProtocol.respond(body: data, etag: "W/\"opaque-v1\"")
        await store.refresh(session: fixture.session)
        XCTAssertNil(store.errorMessage)
        XCTAssertNil(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"))
        XCTAssertEqual(RefreshTestProtocol.lastRequest?.cachePolicy, .reloadIgnoringLocalCacheData)
        XCTAssertEqual(try CatalogCacheRecord.read(from: fixture.cache).etag, "W/\"opaque-v1\"")

        store.filter.query = "Brengulu"
        store.selectedID = "folkklubs-ala-pagrabs"
        store.toggleSaved("folkklubs-ala-pagrabs")
        let results = store.results(location: nil)
        let label = store.checkedLabel
        let cachedBytes = try Data(contentsOf: fixture.cache)
        let past = Date(timeIntervalSince1970: 1_700_000_000)
        try FileManager.default.setAttributes([.modificationDate: past], ofItemAtPath: fixture.cache.path)
        let invalidated = Mutex(false)
        withObservationTracking { _ = store.catalog } onChange: { invalidated.withLock { $0 = true } }

        RefreshTestProtocol.respond(status: 503)
        await store.refresh(session: fixture.session)
        XCTAssertTrue(store.usesOfflineCatalog)
        XCTAssertNotNil(store.errorMessage)
        RefreshTestProtocol.respond(status: 304)
        await store.refresh(session: fixture.session)

        XCTAssertEqual(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"), "W/\"opaque-v1\"")
        XCTAssertFalse(invalidated.withLock { $0 })
        XCTAssertEqual(store.results(location: nil).map(\.beer), results.map(\.beer))
        XCTAssertEqual(store.results(location: nil).map(\.id), results.map(\.id))
        XCTAssertEqual(store.checkedLabel, label)
        XCTAssertEqual(store.selectedID, "folkklubs-ala-pagrabs")
        XCTAssertEqual(store.filter.query, "Brengulu")
        XCTAssertEqual(store.savedIDs, ["folkklubs-ala-pagrabs"])
        XCTAssertEqual(try Data(contentsOf: fixture.cache), cachedBytes)
        XCTAssertEqual(try fixture.cache.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate, past)
        XCTAssertFalse(store.usesOfflineCatalog)
        XCTAssertNil(store.errorMessage)
        XCTAssertFalse(store.isRefreshing)
    }

    @MainActor func testRelaunchUsesPairedValidatorAndLegacyCacheMigrates() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let catalog = try Catalog.bundled()
        let record = CatalogCacheRecord(catalog: catalog, etag: "\"saved-tag\"")
        try JSONEncoder().encode(record).write(to: fixture.cache)
        let relaunched = fixture.makeStore()
        RefreshTestProtocol.respond(status: 304)
        await relaunched.refresh(session: fixture.session)
        XCTAssertNil(relaunched.errorMessage)
        XCTAssertEqual(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"), "\"saved-tag\"")
        XCTAssertEqual(relaunched.venues.count, 165)
        XCTAssertEqual(relaunched.venues.reduce(0) { $0 + $1.beers.count }, 2550)

        let legacy = try JSONEncoder().encode(catalog)
        try legacy.write(to: fixture.cache)
        let migrated = fixture.makeStore()
        XCTAssertEqual(migrated.venues.count, 165)
        RefreshTestProtocol.respond(body: legacy, etag: "W/\"new-tag\"")
        await migrated.refresh(session: fixture.session)
        XCTAssertNil(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"))
        XCTAssertNil(migrated.errorMessage)
        let cached = try CatalogCacheRecord.read(from: fixture.cache)
        XCTAssertEqual(cached.etag, "W/\"new-tag\"")
        XCTAssertEqual(cached.catalog.venues.count, 165)
        XCTAssertEqual(cached.catalog.venues.reduce(0) { $0 + $1.beers.count }, 2550)
    }

    @MainActor func testRejectedCacheCannotValidateTheBundledCatalog() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let bundled = try Catalog.bundled()
        let older = Catalog(schemaVersion: 1, city: bundled.city, currency: "EUR", checkedAt: "2020-01-01", venues: [bundled.venues[0]])
        let invalid = Catalog(schemaVersion: 999, city: bundled.city, currency: "EUR", checkedAt: bundled.checkedAt, venues: bundled.venues)
        for bytes in [
            try JSONEncoder().encode(CatalogCacheRecord(catalog: older, etag: "\"old\"")),
            try JSONEncoder().encode(CatalogCacheRecord(catalog: invalid, etag: "\"invalid\"")),
            Data("{\"cacheVersion\":999,\"etag\":\"bad\"}".utf8),
            Data("broken cache".utf8),
        ] {
            try bytes.write(to: fixture.cache)
            let store = fixture.makeStore()
            XCTAssertEqual(store.venues.count, 165)
            RefreshTestProtocol.respond(status: 304)
            await store.refresh(session: fixture.session)
            XCTAssertNil(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"))
            XCTAssertTrue(store.usesOfflineCatalog)
            XCTAssertNotNil(store.errorMessage) // An unsolicited 304 is not a successful refresh.
            XCTAssertEqual(try Data(contentsOf: fixture.cache), bytes)
        }
    }

    @MainActor func testChangedCatalogWithoutValidatorClearsPreviousTag() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let store = fixture.makeStore()
        let catalog = try Catalog.bundled()
        RefreshTestProtocol.respond(body: try JSONEncoder().encode(catalog), etag: "\"before\"")
        await store.refresh(session: fixture.session)
        _ = store.results(location: nil)
        let changed = Catalog(schemaVersion: 1, city: catalog.city, currency: "EUR", checkedAt: catalog.checkedAt, venues: [catalog.venues.last!])
        RefreshTestProtocol.respond(body: try JSONEncoder().encode(changed))
        await store.refresh(session: fixture.session)
        XCTAssertNil(store.errorMessage)
        XCTAssertEqual(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"), "\"before\"")
        XCTAssertEqual(store.results(location: nil).map(\.id), changed.venues.map(\.id))
        XCTAssertNil(try CatalogCacheRecord.read(from: fixture.cache).etag)
        await store.refresh(session: fixture.session)
        XCTAssertNil(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"))
        XCTAssertNil(store.errorMessage)
    }

    @MainActor func testInvalidOrOlderResponseKeepsValidCacheAndValidator() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let catalog = try Catalog.bundled()
        let store = fixture.makeStore()
        RefreshTestProtocol.respond(body: try JSONEncoder().encode(catalog), etag: "W/\"good\"")
        await store.refresh(session: fixture.session)
        let cachedBytes = try Data(contentsOf: fixture.cache)
        let older = Catalog(schemaVersion: 1, city: catalog.city, currency: "EUR", checkedAt: "2020-01-01", venues: [catalog.venues[0]])
        for data in [Data("{\"schemaVersion\":999}".utf8), try JSONEncoder().encode(older)] {
            RefreshTestProtocol.respond(body: data, etag: "\"rejected\"")
            await store.refresh(session: fixture.session)
            XCTAssertTrue(store.usesOfflineCatalog)
            XCTAssertNotNil(store.errorMessage)
            XCTAssertEqual(store.venues.count, 165)
            XCTAssertEqual(try Data(contentsOf: fixture.cache), cachedBytes)
        }
        RefreshTestProtocol.respond(status: 304)
        await store.refresh(session: fixture.session)
        XCTAssertEqual(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"), "W/\"good\"")
        XCTAssertNil(store.errorMessage)
        XCTAssertFalse(store.usesOfflineCatalog)
    }

    @MainActor func testCanceledRequestAndFailedPersistenceLeaveGoodDataAlone() async throws {
        let fixture = try RefreshFixture()
        defer { fixture.cleanup() }
        let catalog = try Catalog.bundled()
        let bytes = try JSONEncoder().encode(CatalogCacheRecord(catalog: catalog, etag: "\"good\""))
        try bytes.write(to: fixture.cache)
        let store = fixture.makeStore()
        RefreshTestProtocol.respond(error: .cancelled)
        await store.refresh(session: fixture.session)
        XCTAssertFalse(store.usesOfflineCatalog)
        XCTAssertNil(store.errorMessage)
        XCTAssertFalse(store.isRefreshing)
        XCTAssertEqual(try Data(contentsOf: fixture.cache), bytes)

        // A file cannot be a cache directory. A valid remote catalog must not
        // be accepted with an unpersisted validator after this write fails.
        let blocker = fixture.directory.appendingPathComponent("blocker")
        try Data("keep".utf8).write(to: blocker)
        let blockedStore = BeerMapStore(defaults: fixture.defaults, cacheURL: blocker.appendingPathComponent("catalog.json"))
        let changed = Catalog(schemaVersion: 1, city: catalog.city, currency: "EUR", checkedAt: catalog.checkedAt, venues: [catalog.venues[0]])
        RefreshTestProtocol.respond(body: try JSONEncoder().encode(changed), etag: "\"unpersisted\"")
        await blockedStore.refresh(session: fixture.session)
        XCTAssertTrue(blockedStore.usesOfflineCatalog)
        XCTAssertNotNil(blockedStore.errorMessage)
        XCTAssertEqual(blockedStore.venues.count, 165)
        XCTAssertEqual(try Data(contentsOf: blocker), Data("keep".utf8))
        RefreshTestProtocol.respond(status: 304)
        await blockedStore.refresh(session: fixture.session)
        XCTAssertNil(RefreshTestProtocol.lastRequest?.value(forHTTPHeaderField: "If-None-Match"))
        XCTAssertNotNil(blockedStore.errorMessage)
    }

    func testOnlySingleOpaqueEntityTagsAreUsed() {
        for tag in ["\"strong\"", "W/\"weak\"", "\"\"", "\"opaque,comma\""] {
            XCTAssertEqual(CatalogCacheRecord.validETag(tag), tag)
        }
        for tag in ["*", "unquoted", "\"a\", \"b\"", "W/\"line\nfeed\"", "\"quote\"inside\"", String(repeating: "a", count: 4097)] {
            XCTAssertNil(CatalogCacheRecord.validETag(tag))
        }
    }
}

@MainActor private final class RefreshFixture {
    let suite = "BeerMap.ConditionalRefreshTests.\(UUID().uuidString)"
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("conditional-refresh-\(UUID().uuidString)")
    let defaults: UserDefaults
    let session: URLSession
    var cache: URL { directory.appendingPathComponent("catalog.json") }

    init() throws {
        defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [RefreshTestProtocol.self]
        session = URLSession(configuration: configuration)
    }
    func makeStore() -> BeerMapStore { BeerMapStore(defaults: defaults, cacheURL: cache) }
    func cleanup() {
        session.invalidateAndCancel()
        defaults.removePersistentDomain(forName: suite)
        try? FileManager.default.removeItem(at: directory)
    }
}

private final class RefreshTestProtocol: URLProtocol, @unchecked Sendable {
    private struct State: Sendable {
        var status = 200
        var body = Data()
        var etag: String?
        var error: URLError.Code?
        var lastRequest: URLRequest?
    }
    private static let state = Mutex(State())
    static var lastRequest: URLRequest? { state.withLock { $0.lastRequest } }
    static func respond(status: Int = 200, body: Data = Data(), etag: String? = nil, error: URLError.Code? = nil) {
        state.withLock { $0 = State(status: status, body: body, etag: etag, error: error) }
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let value = Self.state.withLock { $0.lastRequest = request; return $0 }
        if let error = value.error { client?.urlProtocol(self, didFailWithError: URLError(error)); return }
        var headers = ["Content-Type": "application/json"]
        headers["ETag"] = value.etag
        let response = HTTPURLResponse(url: request.url!, statusCode: value.status, httpVersion: "HTTP/1.1", headerFields: headers)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: value.body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
