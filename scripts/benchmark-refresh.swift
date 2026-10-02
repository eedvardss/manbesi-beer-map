import Foundation
import Synchronization

// Real store and catalog, optimized on this Mac with an isolated disk cache.
// URLProtocol replaces network latency with deterministic 200/304 responses.
// The main-actor pulse measures scheduling gaps, not device frames or launch.
@main struct RefreshBenchmark {
    @MainActor static func main() async throws {
        let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
        let fullResponses = CommandLine.arguments.contains("--full-response")
        RefreshProtocol.state.withLock { $0.body = data; $0.fullResponses = fullResponses }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("beer-map-refresh-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cache = directory.appendingPathComponent("catalog.json")
        try data.write(to: cache, options: .atomic)
        let suite = "BeerMap.RefreshBenchmark.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = BeerMapStore(defaults: defaults, cacheURL: cache)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [RefreshProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        await store.refresh(session: session) // Warm 200, establish a validator.
        RefreshProtocol.state.withLock { $0.bytes = 0; $0.notModified = 0 }
        let clock = ContinuousClock()
        var gaps = [Double]()
        let pulse = Task { @MainActor in
            var previous = clock.now
            while !Task.isCancelled {
                do { try await Task.sleep(for: .milliseconds(1)) } catch { break }
                let now = clock.now
                gaps.append(Self.milliseconds(previous.duration(to: now)))
                previous = now
            }
        }
        var samples = [Double]()
        for _ in 0..<25 {
            let start = clock.now
            await store.refresh(session: session)
            samples.append(Self.milliseconds(start.duration(to: clock.now)))
            try await Task.sleep(for: .milliseconds(2))
        }
        pulse.cancel()
        await pulse.value
        samples.sort(); gaps.sort()
        let transferred = RefreshProtocol.state.withLock { ($0.bytes, $0.notModified) }
        let output: [String: Any] = [
            "workload": "25 \(fullResponses ? "full-response" : "unchanged") catalog refreshes; 165 venues / 2550 servings",
            "bodyBytes": data.count, "receivedBodyBytes": transferred.0, "notModifiedResponses": transferred.1,
            "refreshMedianMs": samples[12], "refreshP95Ms": samples[23],
            "mainActorPulseP95Ms": gaps.isEmpty ? 0 : gaps[Int(Double(gaps.count - 1) * 0.95)],
            "mainActorPulseMaxMs": gaps.last ?? 0, "pulseSamples": gaps.count,
            "venues": store.venues.count, "servings": store.venues.reduce(0) { $0 + $1.beers.count },
            "error": store.errorMessage ?? "none",
        ]
        print(String(data: try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys]), encoding: .utf8)!)
    }
    static func milliseconds(_ duration: Duration) -> Double {
        let parts = duration.components
        return Double(parts.seconds) * 1000 + Double(parts.attoseconds) / 1e15
    }
}

private final class RefreshProtocol: URLProtocol, @unchecked Sendable {
    struct State: Sendable { var body = Data(); var bytes = 0; var notModified = 0; var fullResponses = false }
    static let state = Mutex(State())
    static let etag = "W/\"benchmark-catalog\""
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let (unchanged, body) = Self.state.withLock { state in
            let unchanged = !state.fullResponses && request.value(forHTTPHeaderField: "If-None-Match") == Self.etag
            if unchanged { state.notModified += 1; return (true, Data()) }
            state.bytes += state.body.count
            return (false, state.body)
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: unchanged ? 304 : 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json", "ETag": Self.etag])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
