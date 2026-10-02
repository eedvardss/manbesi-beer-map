import Foundation

struct Catalog: Codable, Sendable {
    let schemaVersion: Int
    let city: String
    let currency: String
    let checkedAt: String
    let venues: [Venue]

    func validated() throws -> Catalog {
        guard schemaVersion == 1, currency == "EUR", !city.isEmpty,
              checkedAt.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
              !venues.isEmpty, Set(venues.map(\.id)).count == venues.count else {
            throw CatalogError.invalidData
        }
        for venue in venues {
            guard !venue.id.isEmpty, !venue.name.isEmpty, !venue.address.isEmpty,
                  (-90...90).contains(venue.lat), (-180...180).contains(venue.lng),
                  let url = URL(string: venue.sourceUrl), ["https", "http"].contains(url.scheme),
                  !venue.beers.isEmpty, venue.openingHours.map({ $0.week.count == 7 }) ?? true else {
                throw CatalogError.invalidData
            }
            for beer in venue.beers {
                guard !beer.name.isEmpty, beer.price.isFinite, beer.price > 0,
                      beer.volumeMl.map({ $0 > 0 }) ?? true,
                      beer.packageCount.map({ $0 > 0 }) ?? true else { throw CatalogError.invalidData }
            }
        }
        return self
    }

    static func bundled(in bundle: Bundle = .main) throws -> Catalog {
        guard let url = bundle.url(forResource: "venues", withExtension: "json") else {
            throw CatalogError.missingBundle
        }
        return try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: url)).validated()
    }
}

enum CatalogError: LocalizedError {
    case missingBundle, invalidData, unavailable
    var errorDescription: String? {
        switch self {
        case .missingBundle: "Neizdevās ielādēt iebūvēto karti."
        case .invalidData: "Saņemtie kartes dati nav derīgi."
        case .unavailable: "Neizdevās saņemt jaunāko karti."
        }
    }
}

struct Serving: Codable, Hashable, Sendable {
    let name: String
    let volumeMl: Int?
    let price: Double
    var priceIsFrom: Bool? = nil
    var packageCount: Int? = nil

    var perLitre: Double? {
        guard let volumeMl, volumeMl > 0 else { return nil }
        return price / (Double(volumeMl * (packageCount ?? 1)) / 1000)
    }
    var volumeLabel: String {
        guard let volumeMl else { return "Tilpums nav norādīts" }
        return (packageCount ?? 1) > 1 ? "\(packageCount!) × \(volumeMl) ml" : "\(volumeMl) ml"
    }
    var priceLabel: String { (priceIsFrom == true ? "no " : "") + price.euros }
    var litreLabel: String {
        guard let perLitre else { return "Tilpums nav norādīts" }
        return (priceIsFrom == true ? "no " : "") + perLitre.euros + " /l"
    }
}

// One immutable menu presentation. IDs refer to source ordinals, so sorting
// never assigns a different serving the former occupant's row identity.
struct MenuServing: Identifiable, Sendable {
    let id: Int
    let serving: Serving
    let volumeLabel: String
    let priceLabel: String
    let litreLabel: String?

    init(id: Int, serving: Serving) {
        self.id = id
        self.serving = serving
        volumeLabel = serving.volumeLabel
        priceLabel = serving.priceLabel
        litreLabel = serving.perLitre == nil ? nil : serving.litreLabel
    }
}

struct MenuBeer: Identifiable, Sendable {
    let id: String
    let servings: [MenuServing]
}

final class PreparedVenueMenu: Sendable {
    let servings: [MenuServing]
    let beers: [MenuBeer]

    init(_ source: [Serving], sort: VenueSort) {
        servings = source.enumerated().map { MenuServing(id: $0.offset, serving: $0.element) }.sorted {
            if VenueQuery.precedes($0.serving, $1.serving, sort: sort) { return true }
            if VenueQuery.precedes($1.serving, $0.serving, sort: sort) { return false }
            return $0.id < $1.id
        }
        // Group only the published name. Keep every source entry, including
        // duplicates, unknown volumes, multipacks and "from" prices.
        var order: [String] = []
        var groups: [String: [MenuServing]] = [:]
        for row in servings {
            if groups[row.serving.name] == nil { order.append(row.serving.name) }
            groups[row.serving.name, default: []].append(row)
        }
        beers = order.map { MenuBeer(id: $0, servings: groups[$0]!) }
    }
}

struct Venue: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let kind: String
    let address: String
    let lat: Double
    let lng: Double
    let sourceUrl: String
    let sourceLabel: String
    let sourceType: String
    let beers: [Serving]
    let openingHours: OpeningHours?

    var shareURL: URL {
        var components = URLComponents(string: "https://manbesi.lv/")!
        components.queryItems = [URLQueryItem(name: "venue", value: id)]
        return components.url!
    }
    var directionsURL: URL {
        var components = URLComponents(string: "https://maps.apple.com/")!
        components.queryItems = [URLQueryItem(name: "daddr", value: "\(lat),\(lng)"), URLQueryItem(name: "dirflg", value: "w")]
        return components.url!
    }
}

struct OpeningHours: Codable, Sendable {
    let week: [[String]?]
    let sourceUrl: String
    let checkedAt: String
    let note: String?

    // A missing day is unknown. An empty day is closed. Overnight hours
    // also carry into the next day; always use Riga's clock, not the phone's.
    func isOpen(at date: Date) -> Bool? {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Riga")!
        let parts = calendar.dateComponents([.weekday, .hour, .minute], from: date)
        let day = (parts.weekday! + 5) % 7
        let minutes = parts.hour! * 60 + parts.minute!
        return isOpen(day: day, minutes: minutes)
    }

    func isOpen(day: Int, minutes: Int) -> Bool? {
        guard week.count == 7, (0..<7).contains(day), (0..<1440).contains(minutes) else { return nil }
        let today = week[day], yesterday = week[(day + 6) % 7]
        if let today, today.contains(where: { interval in
            guard let (start, end) = Self.interval(interval) else { return false }
            return end <= start ? minutes >= start : minutes >= start && minutes < end
        }) { return true }
        if let yesterday, yesterday.contains(where: { interval in
            guard let (start, end) = Self.interval(interval) else { return false }
            return end <= start && minutes < end
        }) { return true }
        // Unknown preceding hours could include an overnight opening.
        guard today != nil, yesterday != nil else { return nil }
        return false
    }

    private static func interval(_ value: String) -> (Int, Int)? {
        let times = value.split(separator: "-")
        guard times.count == 2, let first = minutes(String(times[0])), let second = minutes(String(times[1])) else { return nil }
        return (first, second)
    }
    private static func minutes(_ value: String) -> Int? {
        let pieces = value.split(separator: ":").compactMap { Int($0) }
        guard pieces.count == 2, (0...24).contains(pieces[0]), (0..<60).contains(pieces[1]),
              pieces[0] != 24 || pieces[1] == 0 else { return nil }
        return pieces[0] * 60 + pieces[1]
    }
}

enum PriceBand: String, CaseIterable, Identifiable {
    case all, under5, fiveToSix, over6
    var id: String { rawValue }
    var label: String {
        switch self { case .all: "Visas cenas"; case .under5: "Zem 5 €"; case .fiveToSix: "5–6 €"; case .over6: "Virs 6 €" }
    }
    func matches(_ beer: Serving) -> Bool {
        switch self { case .all: true; case .under5: beer.price < 5; case .fiveToSix: (5...6).contains(beer.price); case .over6: beer.price > 6 }
    }
}

enum ServingSize: String, CaseIterable, Identifiable {
    case any, regular, halfLitre
    var id: String { rawValue }
    var label: String {
        switch self { case .any: "Jebkurš tilpums"; case .regular: "300–600 ml"; case .halfLitre: "Tieši 500 ml" }
    }
    func matches(_ beer: Serving) -> Bool {
        switch self {
        case .any: true
        case .regular: beer.volumeMl.map { (300...600).contains($0) } == true && (beer.packageCount ?? 1) == 1
        case .halfLitre: beer.volumeMl == 500 && (beer.packageCount ?? 1) == 1
        }
    }
}

enum VenueSort: String, CaseIterable, Identifiable {
    case price, litre, distance, name
    var id: String { rawValue }
    var label: String {
        switch self { case .price: "Lētākā porcija"; case .litre: "Lētākais litrs"; case .distance: "Tuvākās vietas"; case .name: "Nosaukums A–Z" }
    }
}

struct Coordinate: Equatable, Sendable { let lat: Double; let lng: Double }

struct VenueMapBounds: Equatable, Sendable {
    let south: Double
    let north: Double
    let west: Double
    let east: Double

    func contains(lat: Double, lng: Double) -> Bool {
        guard (south...north).contains(lat) else { return false }
        return west <= east ? (west...east).contains(lng) : lng >= west || lng <= east
    }
}
struct VenueFilter: Equatable {
    var query = ""
    var priceBand: PriceBand = .all
    var size: ServingSize = .any
    var sort: VenueSort = .price
    var openOnly = false
    var hasFilters: Bool { priceBand != .all || size != .any || openOnly }
}

// Immutable per-catalog search data. Rebuilt when the store accepts a catalog,
// rather than folding every menu name again on each keystroke/view update.
struct VenueSearchIndex: Sendable {
    let venues: [String: String]
    let beers: [String: [String]]
    init(_ values: [Venue]) {
        venues = Dictionary(uniqueKeysWithValues: values.map { ($0.id, VenueQuery.normalize("\($0.name) \($0.address) \($0.kind)")) })
        beers = Dictionary(uniqueKeysWithValues: values.map { ($0.id, $0.beers.map { VenueQuery.normalize($0.name) }) })
    }
}

struct VenueResult: Identifiable {
    let venue: Venue
    let beer: Serving
    let distanceMetres: Double?
    var id: String { venue.id }
}

enum VenueQuery {
    static func normalize(_ value: String) -> String {
        value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "lv_LV"))
    }
    static func run(_ venues: [Venue], filter: VenueFilter, location: Coordinate? = nil, now: Date = .now, searchIndex: VenueSearchIndex? = nil) -> [VenueResult] {
        let query = normalize(filter.query.trimmingCharacters(in: .whitespacesAndNewlines))
        return venues.compactMap { venue -> VenueResult? in
            if filter.openOnly && venue.openingHours?.isOpen(at: now) != true { return nil }
            let venueMatches = query.isEmpty || (searchIndex?.venues[venue.id] ?? normalize("\(venue.name) \(venue.address) \(venue.kind)")).contains(query)
            let beerTexts = searchIndex?.beers[venue.id]
            var best: Serving?
            for (index, beer) in venue.beers.enumerated() {
                guard filter.priceBand.matches(beer), filter.size.matches(beer),
                      venueMatches || (beerTexts?[index] ?? normalize(beer.name)).contains(query) else { continue }
                if best == nil || precedes(beer, best!, sort: filter.sort) { best = beer }
            }
            guard let best else { return nil }
            let distance = location.map { metres(from: $0, to: Coordinate(lat: venue.lat, lng: venue.lng)) }
            return VenueResult(venue: venue, beer: best, distanceMetres: distance)
        }.sorted { first, second in
            if filter.sort == .name { return first.venue.name.localizedStandardCompare(second.venue.name) == .orderedAscending }
            if filter.sort == .distance, let a = first.distanceMetres, let b = second.distanceMetres, a != b { return a < b }
            if precedes(first.beer, second.beer, sort: filter.sort) { return true }
            if precedes(second.beer, first.beer, sort: filter.sort) { return false }
            return first.venue.name.localizedStandardCompare(second.venue.name) == .orderedAscending
        }
    }
    static func precedes(_ first: Serving, _ second: Serving, sort: VenueSort) -> Bool {
        if sort == .litre, first.perLitre != second.perLitre {
            guard let firstPrice = first.perLitre else { return false }
            guard let secondPrice = second.perLitre else { return true }
            return firstPrice < secondPrice
        }
        if first.price != second.price { return first.price < second.price }
        return (first.volumeMl ?? 0) * (first.packageCount ?? 1) > (second.volumeMl ?? 0) * (second.packageCount ?? 1)
    }
    static func metres(from first: Coordinate, to second: Coordinate) -> Double {
        let radians = Double.pi / 180
        let lat = (second.lat - first.lat) * radians, lng = (second.lng - first.lng) * radians
        let a = pow(sin(lat / 2), 2) + cos(first.lat * radians) * cos(second.lat * radians) * pow(sin(lng / 2), 2)
        return 6_371_000 * 2 * atan2(sqrt(a), sqrt(max(0, 1 - a)))
    }
}

extension Double {
    var euros: String { formatted(.currency(code: "EUR").locale(Locale(identifier: "lv_LV"))) }
    var distanceLabel: String { self < 1000 ? "\(Int((self / 10).rounded()) * 10) m" : "\((self / 1000).formatted(.number.precision(.fractionLength(1)))) km" }
}
