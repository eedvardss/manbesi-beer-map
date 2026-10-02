import Foundation
import Synchronization

// Compile with Models.swift, CatalogRepository.swift and BeerMapStore.swift.
// Makes two real read-only API requests using an isolated cache/defaults suite.
@main struct NativeRefreshProbe {
    @MainActor static func main() async throws {
        let source = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
        let bundled = try JSONDecoder().decode(Catalog.self, from: source).validated()
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("beer-map-live-refresh-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = directory.appendingPathComponent("catalog.json")
        try source.write(to: cache, options: .atomic)
        let suite = "BeerMap.LiveRefreshProbe.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = BeerMapStore(defaults: defaults, cacheURL: cache)
        let delegate = RefreshMetrics()
        let session = URLSession(configuration: .ephemeral, delegate: delegate, delegateQueue: nil)
        defer { session.invalidateAndCancel() }

        await store.refresh(session: session)
        guard store.errorMessage == nil else { throw ProbeError.invalidResult }
        let record = try CatalogCacheRecord.read(from: cache)
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let matchesSnapshot = try encoder.encode(record.catalog) == encoder.encode(bundled)
        let bytes = try Data(contentsOf: cache)
        let modification = try cache.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        store.filter.query = "Brengulu"
        store.selectedID = "folkklubs-ala-pagrabs"
        store.toggleSaved("folkklubs-ala-pagrabs")
        let results = store.results(location: nil).map(\.id)
        await store.refresh(session: session)

        let metrics = delegate.records.withLock { $0 }
        let cacheUnchanged = try Data(contentsOf: cache) == bytes && cache.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate == modification
        let contextRetained = store.filter.query == "Brengulu" && store.selectedID == "folkklubs-ala-pagrabs" && store.savedIDs == ["folkklubs-ala-pagrabs"] && store.results(location: nil).map(\.id) == results
        guard metrics.map(\.status) == [200, 304], record.etag != nil,
              store.errorMessage == nil, !store.usesOfflineCatalog,
              cacheUnchanged, contextRetained else { throw ProbeError.invalidResult }
        let output = ProbeResult(requests: metrics, venues: store.venues.count,
                                 servings: store.venues.reduce(0) { $0 + $1.beers.count },
                                 checkedAt: record.catalog.checkedAt, matchesBundledSnapshot: matchesSnapshot,
                                 cacheUnchangedOn304: cacheUnchanged, interactionContextRetained: contextRetained)
        print(String(data: try encoder.encode(output), encoding: .utf8)!)
    }
}

private enum ProbeError: Error { case invalidResult }
private struct RequestMetric: Codable, Sendable {
    let status: Int
    let receivedBodyBytes: Int64
    let decodedBodyBytes: Int64
    let etag: String?
    let conditionalTag: String?
}
private struct ProbeResult: Codable {
    let requests: [RequestMetric]
    let venues: Int
    let servings: Int
    let checkedAt: String
    let matchesBundledSnapshot: Bool
    let cacheUnchangedOn304: Bool
    let interactionContextRetained: Bool
}
private final class RefreshMetrics: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    let records = Mutex([RequestMetric]())
    func urlSession(_ session: URLSession, task: URLSessionTask, didFinishCollecting metrics: URLSessionTaskMetrics) {
        let values = metrics.transactionMetrics.compactMap { transaction -> RequestMetric? in
            guard let response = transaction.response as? HTTPURLResponse else { return nil }
            return RequestMetric(status: response.statusCode,
                                 receivedBodyBytes: transaction.countOfResponseBodyBytesReceived,
                                 decodedBodyBytes: transaction.countOfResponseBodyBytesAfterDecoding,
                                 etag: response.value(forHTTPHeaderField: "ETag"),
                                 conditionalTag: transaction.request.value(forHTTPHeaderField: "If-None-Match"))
        }
        records.withLock { $0.append(contentsOf: values) }
    }
}
