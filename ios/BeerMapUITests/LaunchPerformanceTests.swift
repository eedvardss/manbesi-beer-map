import XCTest

// Opt-in, optimized Simulator launches with the real bundled catalog. The OS
// and MapKit caches stay warm; this is not a physical-device cold-launch test.
final class LaunchPerformanceTests: XCTestCase {
    @MainActor func testBundledLaunchToFirstFrame() throws {
        try measureBundledLaunch(waitUntilResponsive: false)
    }

    @MainActor func testBundledLaunchToResponsiveFrame() throws {
        try measureBundledLaunch(waitUntilResponsive: true)
    }

    @MainActor private func measureBundledLaunch(waitUntilResponsive: Bool) throws {
        guard ProcessInfo.processInfo.environment["BEER_MAP_LAUNCH_PERFORMANCE"] == "1" else {
            throw XCTSkip("Opt-in Release launch measurement; see docs/performance.md.")
        }
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        let options = XCTMeasureOptions()
        options.iterationCount = 5
        measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: waitUntilResponsive)], options: options) {
            app.launch()
            // The launch metric stops at its chosen frame endpoint. These
            // assertions separately require useful, real price-map content.
            XCTAssertTrue(app.otherElements["map-overview-status"].waitForExistence(timeout: 10))
            XCTAssertTrue(app.staticTexts["165 vietas"].exists)
            XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "pin-")).firstMatch.waitForExistence(timeout: 10))
        }
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = "Release bundled launch with real offline price map"
        image.lifetime = .keepAlways
        add(image)
        let geometry = XCTAttachment(string: app.debugDescription)
        geometry.name = "Release bundled launch geometry"
        geometry.lifetime = .keepAlways
        add(geometry)
    }
}
