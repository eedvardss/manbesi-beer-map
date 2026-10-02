import Foundation
import Observation

@MainActor @Observable
final class BeerMapStore {
    private(set) var catalog: Catalog? { didSet { prepareCatalog() } }
    private(set) var checkedLabel = "Nav datu"
    private(set) var savedIDs: Set<String>
    private(set) var isRefreshing = false
    private(set) var usesOfflineCatalog = false
    private(set) var errorMessage: String?
    var filter = VenueFilter()
    var selectedID: String?
    var now = Date.now
    private let defaults: UserDefaults
    private let cacheURL: URL?
    private let persistsState: Bool
    @ObservationIgnored private var searchIndex = VenueSearchIndex([])
    @ObservationIgnored private var cachedQuery: (key: QueryKey, results: [VenueResult])?
    private struct QueryKey: Equatable {
        let filter: VenueFilter
        let location: Coordinate?
        let openMinute: Int?
    }

    init(defaults: UserDefaults? = nil, cacheURL: URL? = nil, bundle: Bundle = .main, ephemeral: Bool = false) {
        let testing = ProcessInfo.processInfo.arguments.contains("--uitesting")
        persistsState = !ephemeral
        self.defaults = defaults ?? (testing ? UserDefaults(suiteName: "BeerMap.UITests")! : .standard)
        if testing && !ephemeral { self.defaults.removeObject(forKey: "savedVenueIDs") }
        savedIDs = ephemeral ? [] : Set(self.defaults.stringArray(forKey: "savedVenueIDs") ?? [])
        self.cacheURL = (testing || ephemeral) ? nil : (cacheURL ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("BeerMap/catalog.json"))
        let bundled = try? Catalog.bundled(in: bundle)
        if let path = self.cacheURL, let data = try? Data(contentsOf: path),
           let cached = try? JSONDecoder().decode(Catalog.self, from: data).validated(),
           cached.checkedAt >= (bundled?.checkedAt ?? "") {
            catalog = cached
        } else { catalog = bundled }
        prepareCatalog()
        if catalog == nil { errorMessage = CatalogError.missingBundle.localizedDescription }
    }

    var venues: [Venue] { catalog?.venues ?? [] }
    private func prepareCatalog() {
        searchIndex = VenueSearchIndex(venues)
        cachedQuery = nil
        guard let checked = catalog?.checkedAt else { checkedLabel = "Nav datu"; return }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        checkedLabel = formatter.date(from: checked).map {
            $0.formatted(.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "lv_LV")))
        } ?? checked
    }
    func results(location: Coordinate?, savedOnly: Bool = false) -> [VenueResult] {
        // Reading catalog/filter here keeps Observation dependencies explicit.
        // Cache only one input set; typing cannot grow memory without bound.
        let values = venues
        let key = QueryKey(filter: filter, location: location, openMinute: filter.openOnly ? Int(now.timeIntervalSince1970 / 60) : nil)
        let matches: [VenueResult]
        if let cachedQuery, cachedQuery.key == key { matches = cachedQuery.results }
        else {
            matches = VenueQuery.run(values, filter: filter, location: location, now: now, searchIndex: searchIndex)
            cachedQuery = (key, matches)
        }
        return savedOnly ? matches.filter { savedIDs.contains($0.id) } : matches
    }
    func result(id: String, location: Coordinate?) -> VenueResult? {
        if let match = results(location: location).first(where: { $0.id == id }) { return match }
        var fallback = VenueFilter()
        fallback.sort = filter.sort
        return VenueQuery.run(venues.filter { $0.id == id }, filter: fallback, location: location, now: now, searchIndex: searchIndex).first
    }
    func toggleSaved(_ id: String) {
        if savedIDs.contains(id) { savedIDs.remove(id) } else { savedIDs.insert(id) }
        if persistsState { defaults.set(savedIDs.sorted(), forKey: "savedVenueIDs") }
    }
    func resetFilters() { filter = VenueFilter() }

    func refresh(session: URLSession = .shared) async {
        guard !isRefreshing else { return }
        if ProcessInfo.processInfo.arguments.contains("--offline") { usesOfflineCatalog = true; return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            var request = URLRequest(url: URL(string: "https://manbesi.lv/api/venues")!)
            request.timeoutInterval = 15
            let (data, response) = try await session.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 10_000_000 else { throw CatalogError.unavailable }
            let remote = try JSONDecoder().decode(Catalog.self, from: data).validated()
            guard remote.checkedAt >= (catalog?.checkedAt ?? "") else { throw CatalogError.invalidData }
            // Persist only valid catalogs; a failure never removes the offline copy.
            if let cacheURL {
                try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                try data.write(to: cacheURL, options: .atomic)
            }
            catalog = remote
            usesOfflineCatalog = false
            errorMessage = nil
        } catch {
            usesOfflineCatalog = catalog != nil
            errorMessage = catalog == nil ? error.localizedDescription : "Jaunāko karti neizdevās ielādēt. Saglabātās cenas joprojām ir pieejamas."
        }
    }

    func open(_ url: URL) {
        let id: String?
        if url.scheme == "manbesi", url.host == "venue" { id = url.pathComponents.dropFirst().first }
        else if url.host == "manbesi.lv" { id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "venue" }?.value }
        else { id = nil }
        if let id, venues.contains(where: { $0.id == id }) { selectedID = id }
    }
}
