import Foundation
import Observation

@MainActor @Observable
final class BeerMapStore {
    private(set) var catalog: Catalog?
    private(set) var savedIDs: Set<String>
    private(set) var isRefreshing = false
    private(set) var usesOfflineCatalog = false
    private(set) var errorMessage: String?
    var filter = VenueFilter()
    var selectedID: String?
    var now = Date.now
    private let defaults: UserDefaults
    private let cacheURL: URL?

    init(defaults: UserDefaults? = nil, cacheURL: URL? = nil, bundle: Bundle = .main) {
        let testing = ProcessInfo.processInfo.arguments.contains("--uitesting")
        self.defaults = defaults ?? (testing ? UserDefaults(suiteName: "BeerMap.UITests")! : .standard)
        if testing { self.defaults.removeObject(forKey: "savedVenueIDs") }
        savedIDs = Set(self.defaults.stringArray(forKey: "savedVenueIDs") ?? [])
        self.cacheURL = testing ? nil : (cacheURL ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("BeerMap/catalog.json"))
        let bundled = try? Catalog.bundled(in: bundle)
        if let path = self.cacheURL, let data = try? Data(contentsOf: path),
           let cached = try? JSONDecoder().decode(Catalog.self, from: data).validated(),
           cached.checkedAt >= (bundled?.checkedAt ?? "") {
            catalog = cached
        } else { catalog = bundled }
        if catalog == nil { errorMessage = CatalogError.missingBundle.localizedDescription }
    }

    var venues: [Venue] { catalog?.venues ?? [] }
    var checkedLabel: String {
        guard let checked = catalog?.checkedAt else { return "Nav datu" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: checked) else { return checked }
        return date.formatted(.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "lv_LV")))
    }
    func results(location: Coordinate?, savedOnly: Bool = false) -> [VenueResult] {
        VenueQuery.run(savedOnly ? venues.filter { savedIDs.contains($0.id) } : venues, filter: filter, location: location, now: now)
    }
    func result(id: String, location: Coordinate?) -> VenueResult? {
        if let match = results(location: location).first(where: { $0.id == id }) { return match }
        var fallback = VenueFilter()
        fallback.sort = filter.sort
        return VenueQuery.run(venues.filter { $0.id == id }, filter: fallback, location: location, now: now).first
    }
    func toggleSaved(_ id: String) {
        if savedIDs.contains(id) { savedIDs.remove(id) } else { savedIDs.insert(id) }
        defaults.set(savedIDs.sorted(), forKey: "savedVenueIDs")
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
