import XCTest

// Opt in with TEST_RUNNER_BEER_MAP_MENU_PERFORMANCE=1. Run this against an
// optimized Release build; CPU/memory cover the app process, not just SwiftUI.
final class VenueMenuPerformanceTests: XCTestCase {
    @MainActor func testLargeMenuSourceUpdates() throws {
        guard ProcessInfo.processInfo.environment["BEER_MAP_MENU_PERFORMANCE"] == "1" else {
            throw XCTSkip("Opt-in Release menu measurement; see docs/performance.md.")
        }
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        app.launch()
        app.tabBars.buttons["Vietas"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("ALA Pagrabs\n")
        app.buttons["venue-folkklubs-ala-pagrabs"].tap()
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        let source = app.buttons["Cenu avots"]
        for _ in 0..<15 {
            if source.isHittable { break }
            app.scrollViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(source.isHittable)
        let before = XCTAttachment(screenshot: app.screenshot())
        before.name = "Release full menu and source before updates"
        before.lifetime = .keepAlways
        add(before)
        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTClockMetric(), XCTCPUMetric(application: app), XCTMemoryMetric(application: app)], options: options) {
            for _ in 0..<8 { source.tap() }
        }
        XCTAssertTrue(source.isHittable)
        let after = XCTAttachment(screenshot: app.screenshot())
        after.name = "Release source after repeated updates"
        after.lifetime = .keepAlways
        add(after)
    }
}
