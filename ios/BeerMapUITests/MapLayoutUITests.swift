import XCTest

final class MapLayoutUITests: XCTestCase {
    @MainActor func testMapAttributionAndControlsInLightAppearance() {
        verifyMapLayout(style: "Light")
    }

    @MainActor func testMapAttributionAndControlsInDarkAppearance() {
        verifyMapLayout(style: "Dark")
    }

    @MainActor func testMapAttributionAndControlsWithLargestText() {
        verifyMapLayout(style: "Dark", textCategory: "UICTContentSizeCategoryAccessibilityXXXL")
    }

    @MainActor private func verifyMapLayout(style: String, textCategory: String? = nil) {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline", style == "Dark" ? "--test-dark" : "--test-light"]
        if let textCategory {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textCategory]
        }
        app.launch()
        let map = app.otherElements["venue-map"]
        let status = app.otherElements["map-overview-status"]
        let legal = app.links["Legal"]
        let locate = app.buttons["locate"]
        XCTAssertTrue(map.waitForExistence(timeout: 10))
        XCTAssertTrue(legal.waitForExistence(timeout: 10))
        XCTAssertTrue(status.exists)
        XCTAssertTrue(locate.isHittable)
        XCTAssertGreaterThan(map.frame.height, 200)
        XCTAssertLessThanOrEqual(map.frame.maxY, status.frame.minY + 1)
        XCTAssertTrue(map.frame.contains(legal.frame))
        XCTAssertGreaterThanOrEqual(status.frame.minY - legal.frame.maxY, 9)
        XCTAssertFalse(legal.frame.intersects(status.frame))
        XCTAssertFalse(legal.frame.intersects(locate.frame))
        XCTAssertGreaterThanOrEqual(status.frame.maxY, locate.frame.maxY)
        XCTAssertLessThanOrEqual(status.frame.maxY, app.tabBars.firstMatch.frame.minY + 1)
        if textCategory != nil {
            // Confirm the requested accessibility category actually affected
            // rendered type; a launch argument alone is not evidence.
            XCTAssertGreaterThan(app.staticTexts["165 vietas"].frame.height, 30)
            XCTAssertGreaterThan(app.buttons["500 ml"].frame.height, 30)
        }
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = "Map layout geometry - \(style) - \(textCategory ?? "default")"
        tree.lifetime = .keepAlways
        add(tree)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Map attribution and controls - \(style) - \(textCategory ?? "default")"
        shot.lifetime = .keepAlways
        add(shot)
        if textCategory != nil {
            // Exercise the horizontally scrolling filters at the largest
            // text size, then check a real catalog result change.
            let filters = app.scrollViews.containing(.button, identifier: "500 ml").firstMatch
            filters.swipeLeft()
            let halfLitre = app.buttons["500 ml"]
            XCTAssertTrue(halfLitre.isHittable)
            halfLitre.tap()
            XCTAssertTrue(app.staticTexts["131 vietas"].waitForExistence(timeout: 5))
            XCTAssertFalse(legal.frame.intersects(status.frame))
            let filtered = XCTAttachment(screenshot: app.screenshot())
            filtered.name = "Largest text after exact serving filter"
            filtered.lifetime = .keepAlways
            add(filtered)
        }
        app.terminate()
    }
}
