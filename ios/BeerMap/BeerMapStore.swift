import Foundation
import Observation

@MainActor @Observable
final class BeerMapStore {
    private(set) var catalog: Catalog?
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
    @ObservationIgnored private var etag: String?
    @ObservationIgnored private var searchIndex = VenueSearchIndex([])
    @ObservationIgnored private var cachedQuery: (key: QueryKey, results: [VenueResult])?
    @ObservationIgnored private var cachedMenu: (venueID: String, sort: VenueSort, source: [Serving], menu: PreparedVenueMenu)?
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
        if let path = self.cacheURL, let cached = try? CatalogCacheRecord.read(from: path),
           cached.catalog.checkedAt >= (bundled?.checkedAt ?? "") {
            catalog = cached.catalog
            etag = cached.etag
        } else { catalog = bundled }
        if let catalog { accept(PreparedCatalog(catalog)) }
        if catalog == nil { errorMessage = CatalogError.missingBundle.localizedDescription }
    }

    var venues: [Venue] { catalog?.venues ?? [] }
    private func accept(_ prepared: PreparedCatalog) {
        searchIndex = prepared.searchIndex
        checkedLabel = prepared.checkedLabel
        cachedQuery = nil
        cachedMenu = nil
        catalog = prepared.catalog
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
    func menu(for venue: Venue) -> PreparedVenueMenu {
        let sort = filter.sort
        if let cachedMenu, cachedMenu.venueID == venue.id,
           cachedMenu.sort == sort, cachedMenu.source == venue.beers {
            return cachedMenu.menu
        }
        let menu = PreparedVenueMenu(venue.beers, sort: sort)
        // Retain only one venue/sort. Compare source data so a frozen sheet
        // and a newly refreshed venue cannot borrow one another's menu.
        cachedMenu = (venue.id, sort, venue.beers, menu)
        return menu
    }
    func toggleSaved(_ id: String) {
        if savedIDs.contains(id) { savedIDs.remove(id) } else { savedIDs.insert(id) }
        if persistsState { defaults.set(savedIDs.sorted(), forKey: "savedVenueIDs") }
    }
    func resetFilters() { filter = VenueFilter() }

    func refresh(session: URLSession = .shared) async {
        guard !isRefreshing, !Task.isCancelled else { return }
        if ProcessInfo.processInfo.arguments.contains("--offline") { usesOfflineCatalog = true; return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            // Manage the conditional request ourselves; URLCache must not turn
            // a network 304 into a cached 200 that repeats decoding and writes.
            var request = URLRequest(url: URL(string: "https://manbesi.lv/api/venues")!, cachePolicy: .reloadIgnoringLocalCacheData)
            request.timeoutInterval = 15
            if catalog != nil, let etag { request.setValue(etag, forHTTPHeaderField: "If-None-Match") }
            let (data, response) = try await session.data(for: request)
            try Task.checkCancellation()
            guard let response = response as? HTTPURLResponse else { throw CatalogError.unavailable }
            if response.statusCode == 304 {
                guard catalog != nil, request.value(forHTTPHeaderField: "If-None-Match") != nil else { throw CatalogError.unavailable }
                // No catalog assignment, index rebuild, query invalidation or
                // disk write when the server confirms this representation.
            } else {
                guard response.statusCode == 200 else { throw CatalogError.unavailable }
                let nextETag = CatalogCacheRecord.validETag(response.value(forHTTPHeaderField: "ETag"))
                let minimumDate = catalog?.checkedAt ?? ""
                let path = cacheURL
                let preparation = Task.detached(priority: .utility) {
                    try CatalogRepository.prepare(data, etag: nextETag, minimumDate: minimumDate, cacheURL: path)
                }
                let prepared = try await withTaskCancellationHandler {
                    try await preparation.value
                } onCancel: {
                    preparation.cancel()
                }
                try Task.checkCancellation()
                accept(prepared)
                etag = nextETag
            }
            usesOfflineCatalog = false
            errorMessage = nil
        } catch {
            // A disappearing screen or canceled request is not an outage.
            guard !Task.isCancelled, !(error is CancellationError), (error as? URLError)?.code != .cancelled else { return }
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
