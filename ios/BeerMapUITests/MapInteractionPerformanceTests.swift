import XCTest

// Opt-in Release workload. Automation time and MapKit/network work are included;
// these metrics do not measure frame delivery on a physical iPhone.
final class MapInteractionPerformanceTests: XCTestCase {
    @MainActor func testMapPanAndZoom() throws {
        guard ProcessInfo.processInfo.environment["BEER_MAP_MAP_PERFORMANCE"] == "1" else {
            throw XCTSkip("Opt-in Release map measurement; see docs/performance.md.")
        }
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        app.launch()
        let map = app.otherElements["venue-map"]
        XCTAssertTrue(map.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "pin-")).firstMatch.waitForExistence(timeout: 10))
        capture(app, name: "Release overview before map workload")
        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTClockMetric(), XCTCPUMetric(application: app), XCTMemoryMetric(application: app)], options: options) {
            map.pinch(withScale: 1.6, velocity: 1)
            let start = map.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.5))
            let end = map.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.5))
            start.press(forDuration: 0.1, thenDragTo: end)
            end.press(forDuration: 0.1, thenDragTo: start)
            map.pinch(withScale: 0.625, velocity: -1)
        }
        XCTAssertTrue(map.isHittable)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "pin-")).firstMatch.exists)
        capture(app, name: "Release overview after map workload")
    }

    @MainActor private func capture(_ app: XCUIApplication, name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }
}
