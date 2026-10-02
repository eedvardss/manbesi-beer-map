import XCTest
import MapKit
@testable import BeerMap

final class MapAnnotationTests: XCTestCase {
    @MainActor func testRetainedAnnotationTracksAcceptedCoordinatesWithoutRedundantNotifications() {
        let original = result(lat: 56.95, lng: 24.11)
        let annotation = VenueAnnotation(result: original, sort: .price)
        let notifications = CoordinateNotifications()
        let observation = annotation.observe(\.coordinate, options: .new) { _, _ in
            // This KVO notification is synchronous with our main-actor setter.
            MainActor.assumeIsolated { notifications.count += 1 }
        }
        defer { observation.invalidate() }
        XCTAssertFalse(annotation.update(result: original, sort: .price))
        XCTAssertEqual(notifications.count, 0)
        let moved = result(lat: 56.96, lng: 24.12)
        XCTAssertFalse(annotation.update(result: moved, sort: .price))
        XCTAssertEqual(annotation.coordinate.latitude, moved.venue.lat)
        XCTAssertEqual(annotation.coordinate.longitude, moved.venue.lng)
        XCTAssertEqual(notifications.count, 1)
        XCTAssertFalse(annotation.update(result: moved, sort: .price))
        XCTAssertEqual(notifications.count, 1)
        let renamed = result(lat: 56.96, lng: 24.12, name: "Updated source name")
        XCTAssertTrue(annotation.update(result: renamed, sort: .price))
        XCTAssertEqual(annotation.title, renamed.venue.name)
        XCTAssertEqual(notifications.count, 1)
        XCTAssertTrue(annotation.update(result: renamed, sort: .litre))
        XCTAssertEqual(notifications.count, 1)
    }

    @MainActor func testReusedMarkerKeepsMultipackFromAndUnknownVolumeSemantics() {
        let pack = Serving(name: "Fixture beer", volumeMl: 500, price: 6, priceIsFrom: true, packageCount: 3)
        let annotation = VenueAnnotation(result: result(beer: pack), sort: .price)
        let marker = PriceAnnotationView(annotation: annotation, reuseIdentifier: "fixture")
        for calm in [false, true] {
            marker.configure(annotation, calmStyle: calm)
            XCTAssertTrue(marker.accessibilityLabel!.contains("no 6,00"))
            XCTAssertTrue(marker.accessibilityLabel!.contains("3 × 500 ml"))
            XCTAssertTrue(annotation.update(result: result(beer: pack), sort: .litre))
            marker.configure(annotation, calmStyle: calm)
            XCTAssertTrue(marker.accessibilityLabel!.contains("no 4,00"))
            XCTAssertTrue(marker.accessibilityLabel!.contains("/l"))
            let unknown = Serving(name: "Fixture unknown", volumeMl: nil, price: 4)
            XCTAssertTrue(annotation.update(result: result(name: "Unknown-volume place", beer: unknown), sort: .litre))
            marker.configure(annotation, calmStyle: calm)
            XCTAssertTrue(marker.accessibilityLabel!.contains("Unknown-volume place"))
            XCTAssertTrue(marker.accessibilityLabel!.contains("— €/l"))
            XCTAssertTrue(marker.accessibilityLabel!.contains("Tilpums nav norādīts"))
            _ = annotation.update(result: result(beer: pack), sort: .price)
        }
    }

    @MainActor func testClusterBorderResolvesAppearanceOnTheRetainedView() {
        let cluster = QuietClusterView(annotation: nil, reuseIdentifier: "fixture")
        cluster.traitOverrides.userInterfaceStyle = .light
        cluster.updateTraitsIfNeeded()
        cluster.configure(count: 19)
        let lightBorder = cluster.layer.borderColor
        XCTAssertEqual(lightBorder, UIColor.separator.resolvedColor(with: cluster.traitCollection).cgColor)
        cluster.traitOverrides.userInterfaceStyle = .dark
        cluster.updateTraitsIfNeeded()
        XCTAssertEqual(cluster.layer.borderColor, UIColor.separator.resolvedColor(with: cluster.traitCollection).cgColor)
        XCTAssertNotEqual(lightBorder, cluster.layer.borderColor)
        XCTAssertTrue(cluster.accessibilityLabel!.hasPrefix("19 vietas"))
        cluster.traitOverrides.userInterfaceStyle = .light
        cluster.updateTraitsIfNeeded()
        XCTAssertEqual(cluster.layer.borderColor, lightBorder)
    }

    private func result(lat: Double = 56.95, lng: Double = 24.11, name: String = "Fixture place",
                        beer: Serving = Serving(name: "Fixture beer", volumeMl: 500, price: 4)) -> VenueResult {
        let venue = Venue(id: "fixture", name: name, kind: "bar", address: "Fixture address", lat: lat, lng: lng,
                          sourceUrl: "https://example.com/menu", sourceLabel: "Fixture menu", sourceType: "menu",
                          beers: [beer], openingHours: nil)
        return VenueResult(venue: venue, beer: beer, distanceMetres: nil)
    }
}

@MainActor private final class CoordinateNotifications {
    var count = 0
}
