import XCTest
@testable import BeerMap

final class VenueMenuTests: XCTestCase {
    func testCompletePublishedMenusAndStableSourceIdentities() throws {
        let catalog = try Catalog.bundled()
        for venue in catalog.venues {
            for sort in VenueSort.allCases {
                let menu = PreparedVenueMenu(venue.beers, sort: sort)
                let reference = venue.beers.sorted { VenueQuery.precedes($0, $1, sort: sort) }
                XCTAssertEqual(menu.servings.map(\.serving), reference, venue.id)
                XCTAssertEqual(Set(menu.servings.map(\.id)), Set(venue.beers.indices))
                let grouped = menu.beers.flatMap(\.servings).sorted { $0.id < $1.id }
                XCTAssertEqual(grouped.map(\.serving), venue.beers, venue.id)
                XCTAssertEqual(menu.beers.count, Set(venue.beers.map(\.name)).count)
                for beer in menu.beers {
                    XCTAssertTrue(beer.servings.allSatisfy { $0.serving.name == beer.id })
                }
                for row in menu.servings {
                    XCTAssertEqual(row.serving, venue.beers[row.id])
                    XCTAssertEqual(row.volumeLabel, row.serving.volumeLabel)
                    XCTAssertEqual(row.priceLabel, row.serving.priceLabel)
                    XCTAssertEqual(row.litreLabel, row.serving.perLitre == nil ? nil : row.serving.litreLabel)
                }
            }
        }
    }

    func testGroupingKeepsDuplicateUnknownMultipackAndFromEntries() {
        let source = [
            Serving(name: "IPA", volumeMl: nil, price: 2, priceIsFrom: true),
            Serving(name: "ipa", volumeMl: 500, price: 4),
            Serving(name: "ĪPA", volumeMl: 500, price: 4),
            Serving(name: "IPA", volumeMl: 500, price: 6, packageCount: 3),
            Serving(name: "IPA", volumeMl: 500, price: 6, packageCount: 3)
        ]
        for sort in VenueSort.allCases {
            let menu = PreparedVenueMenu(source, sort: sort)
            XCTAssertEqual(Set(menu.beers.map(\.id)), ["IPA", "ipa", "ĪPA"])
            let ipa = menu.beers.first { $0.id == "IPA" }!
            XCTAssertEqual(Set(ipa.servings.map(\.id)), [0, 3, 4])
            let unknown = menu.servings.first { $0.id == 0 }!
            XCTAssertEqual(unknown.volumeLabel, "Tilpums nav norādīts")
            XCTAssertTrue(unknown.priceLabel.hasPrefix("no "))
            XCTAssertNil(unknown.litreLabel)
            let pack = menu.servings.first { $0.id == 3 }!
            XCTAssertEqual(pack.volumeLabel, "3 × 500 ml")
            XCTAssertEqual(pack.serving.perLitre, 4)
            if sort == .litre { XCTAssertEqual(menu.servings.last?.id, 0) }
        }
    }

    @MainActor func testMenuCacheTracksContentAndSortAndRemainsBounded() throws {
        let store = BeerMapStore(ephemeral: true)
        let ala = try XCTUnwrap(store.venues.first { $0.id == "folkklubs-ala-pagrabs" })
        let banshee = try XCTUnwrap(store.venues.first { $0.id == "banshee" })
        let first = store.menu(for: ala)
        store.toggleSaved(ala.id)
        store.filter.query = "IPA"
        store.filter.size = .halfLitre
        store.now = store.now.addingTimeInterval(60)
        XCTAssertTrue(first === store.menu(for: ala))
        // Detail always contains the entire source menu despite search/size.
        XCTAssertEqual(first.servings.count, ala.beers.count)
        store.filter.sort = .litre
        let litre = store.menu(for: ala)
        XCTAssertFalse(first === litre)
        XCTAssertTrue(litre === store.menu(for: ala))
        _ = store.menu(for: banshee)
        XCTAssertFalse(litre === store.menu(for: ala))
        let changed = Venue(id: ala.id, name: ala.name, kind: ala.kind, address: ala.address,
                            lat: ala.lat, lng: ala.lng, sourceUrl: ala.sourceUrl, sourceLabel: ala.sourceLabel,
                            sourceType: ala.sourceType, beers: [Serving(name: "Changed source", volumeMl: 500, price: 9)], openingHours: ala.openingHours)
        XCTAssertEqual(store.menu(for: changed).servings.first?.serving.name, "Changed source")
        // A frozen sheet and refreshed result with the same venue ID coexist.
        XCTAssertEqual(store.menu(for: ala).servings.count, ala.beers.count)
    }
}
