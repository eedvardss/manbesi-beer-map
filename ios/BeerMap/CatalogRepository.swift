import Foundation

// The validator and its exact catalog travel together in one atomic cache file.
// Existing raw Catalog caches remain readable, but have no HTTP validator.
struct CatalogCacheRecord: Codable, Sendable {
    static let maximumBytes = 10_000_000
    let catalog: Catalog
    let etag: String?

    init(catalog: Catalog, etag: String?) {
        self.catalog = catalog
        self.etag = Self.validETag(etag)
    }

    private enum CodingKeys: String, CodingKey { case cacheVersion, catalog, etag }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let version = try container.decodeIfPresent(Int.self, forKey: .cacheVersion) {
            guard version == 1 else { throw CatalogError.invalidData }
            catalog = try container.decode(Catalog.self, forKey: .catalog)
            etag = Self.validETag(try container.decodeIfPresent(String.self, forKey: .etag))
        } else {
            catalog = try Catalog(from: decoder)
            etag = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(1, forKey: .cacheVersion)
        try container.encode(catalog, forKey: .catalog)
        try container.encodeIfPresent(etag, forKey: .etag)
    }

    static func read(from url: URL) throws -> Self {
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? maximumBytes
        guard size < maximumBytes else { throw CatalogError.invalidData }
        let record = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        return Self(catalog: try record.catalog.validated(), etag: record.etag)
    }

    // ETag is opaque, including a weak W/ prefix. Reject malformed persisted
    // values rather than sending lists, wildcards or control characters.
    static func validETag(_ value: String?) -> String? {
        guard let value, value.utf8.count <= 4096 else { return nil }
        let tag = value.hasPrefix("W/") ? value.dropFirst(2) : value[...]
        guard tag.count >= 2, tag.first == "\"", tag.last == "\"",
              tag.dropFirst().dropLast().utf8.allSatisfy({ $0 == 0x21 || (0x23...0x7e).contains($0) || $0 >= 0x80 }) else { return nil }
        return value
    }
}

struct PreparedCatalog: Sendable {
    let catalog: Catalog
    let searchIndex: VenueSearchIndex
    let checkedLabel: String

    init(_ catalog: Catalog) {
        self.catalog = catalog
        searchIndex = VenueSearchIndex(catalog.venues)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        checkedLabel = formatter.date(from: catalog.checkedAt).map {
            $0.formatted(.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "lv_LV")))
        } ?? catalog.checkedAt
    }
}

enum CatalogRepository {
    // Called by a detached utility task; decoding, indexing, date formatting
    // and disk work must finish before the main actor accepts the catalog.
    static func prepare(_ data: Data, etag: String?, minimumDate: String, cacheURL: URL?) throws -> PreparedCatalog {
        try Task.checkCancellation()
        guard data.count < CatalogCacheRecord.maximumBytes else { throw CatalogError.unavailable }
        let catalog = try JSONDecoder().decode(Catalog.self, from: data).validated()
        guard catalog.checkedAt >= minimumDate else { throw CatalogError.invalidData }
        let prepared = PreparedCatalog(catalog)
        try Task.checkCancellation()
        if let cacheURL {
            let record = CatalogCacheRecord(catalog: catalog, etag: etag)
            let encoded = try JSONEncoder().encode(record)
            guard encoded.count < CatalogCacheRecord.maximumBytes else { throw CatalogError.invalidData }
            try Task.checkCancellation()
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try encoded.write(to: cacheURL, options: .atomic)
        }
        return prepared
    }
}
