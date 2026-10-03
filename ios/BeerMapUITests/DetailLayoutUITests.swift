import XCTest

// Regression checks for the observed heading splits, narrow serving columns,
// unscaled quote and clipped initial accessibility sheet. These use real menus.
final class DetailLayoutUITests: XCTestCase {
#if DEBUG
    @MainActor func testDraftMaximumTextMenuAndSource() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-dark", "--design-max-text"]
        app.launch()
        let search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("ALA Pagrabs\n")
        let venue = app.buttons["study-venue-folkklubs-ala-pagrabs"]
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        venue.tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        XCTAssertGreaterThan(app.staticTexts["study-selected-price"].frame.height, 60)
        capture(app, name: "Draft maximum text identity and quote")
        let scroll = app.scrollViews["study-detail-scroll"]
        let source = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Avots ·")).firstMatch
        reveal(source, in: scroll)
        source.tap()
        let note = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Lejupielāde nemaina")).firstMatch
        reveal(note, in: scroll)
        XCTAssertTrue(note.label.contains("Cenas var būt mainījušās"))
        assertWithinWidth(note, app: app)
        capture(app, name: "Draft maximum text source disclosure")
        // Return to the same disclosure without relying on implicit AX scrolling.
        reveal(source, in: scroll)
        source.tap()
        let heading = app.staticTexts["study-menu-heading"]
        let count = app.staticTexts["study-menu-count"]
        reveal(heading, in: scroll)
        XCTAssertEqual(count.label, "73 porcijas")
        XCTAssertLessThan(heading.frame.height, 80)
        XCTAssertGreaterThanOrEqual(count.frame.minY, heading.frame.maxY)
        capture(app, name: "Draft maximum text actions and menu heading")
        let volume = app.staticTexts["serving-volume-50"]
        let price = app.staticTexts["serving-price-50"]
        reveal(price, in: scroll)
        XCTAssertEqual(volume.label, "3000 ml")
        XCTAssertTrue(price.label.contains("18,90"))
        XCTAssertLessThan(volume.frame.height, 80)
        XCTAssertGreaterThanOrEqual(price.frame.minY, volume.frame.maxY)
        XCTAssertEqual(price.frame.minX, volume.frame.minX, accuracy: 1)
        assertWithinWidth(volume, app: app)
        assertWithinWidth(price, app: app)
        capture(app, name: "Draft maximum text exact 3000 ml serving")
        app.buttons["study-close-detail"].tap()
        XCTAssertTrue(venue.isHittable)
    }
#endif

    @MainActor func testProductMenuInLightAppearance() {
        let app = product(query: "ALA Pagrabs", venueID: "folkklubs-ala-pagrabs", maximumText: false)
        let quote = app.staticTexts["venue-selected-price"]
        XCTAssertTrue(quote.label.contains("2,80"))
        XCTAssertLessThan(quote.frame.height, 50)
        capture(app, name: "Product ordinary light detail")
        let scroll = app.scrollViews["venue-detail-scroll"]
        scroll.swipeUp()
        let heading = app.staticTexts["venue-menu-heading"]
        reveal(heading, in: scroll)
        XCTAssertEqual(app.staticTexts["venue-menu-count"].label, "73 porcijas")
        XCTAssertGreaterThan(app.staticTexts["venue-menu-count"].frame.minX, heading.frame.maxX)
        let row = app.staticTexts["venue-serving-0"]
        XCTAssertTrue(row.label.contains("Brālis rūgtais, 300 ml, 2,80"))
        capture(app, name: "Product ordinary light menu columns")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(app.buttons["venue-folkklubs-ala-pagrabs"].isHittable)
    }

    @MainActor func testProductMenuAtMaximumText() {
        let app = product(query: "ALA Pagrabs", venueID: "folkklubs-ala-pagrabs", maximumText: true)
        // The accessible presentation should start at full height.
        XCTAssertLessThan(app.staticTexts["venue-detail-name"].frame.minY, 200)
        let quote = app.staticTexts["venue-selected-price"]
        XCTAssertGreaterThan(quote.frame.height, 60)
        XCTAssertTrue(quote.label.contains("2,80"))
        XCTAssertEqual(app.staticTexts["venue-selected-volume"].label, "300 ml")
        assertWithinWidth(quote, app: app)
        capture(app, name: "Product maximum text full height detail")
        let scroll = app.scrollViews["venue-detail-scroll"]
        let heading = app.staticTexts["venue-menu-heading"]
        reveal(heading, in: scroll)
        let count = app.staticTexts["venue-menu-count"]
        XCTAssertEqual(count.label, "73 porcijas")
        XCTAssertLessThan(heading.frame.height, 80)
        XCTAssertGreaterThanOrEqual(count.frame.minY, heading.frame.maxY)
        capture(app, name: "Product maximum text readable actions and heading")
        let row = app.staticTexts["venue-serving-0"]
        reveal(row, in: scroll)
        XCTAssertTrue(row.label.contains("Brālis rūgtais, 300 ml, 2,80"))
        XCTAssertTrue(row.label.contains("9,33"))
        assertWithinWidth(row, app: app)
        capture(app, name: "Product maximum text complete serving values")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(app.buttons["venue-folkklubs-ala-pagrabs"].isHittable)
    }

    @MainActor func testProductUnknownVolumeAndSourceAtMaximumText() {
        let app = product(query: "Snuggest", venueID: "the-snuggest", maximumText: true)
        XCTAssertEqual(app.staticTexts["venue-selected-volume"].label, "Tilpums nav norādīts")
        XCTAssertGreaterThan(app.staticTexts["venue-detail-name"].frame.height, 100)
        let scroll = app.scrollViews["venue-detail-scroll"]
        let row = app.staticTexts["venue-serving-0"]
        reveal(row, in: scroll)
        XCTAssertTrue(row.label.contains("Non Alcoholic Beer, Tilpums nav norādīts, 5,00"))
        XCTAssertFalse(row.label.contains("/l"))
        assertWithinWidth(row, app: app)
        capture(app, name: "Product maximum text unknown serving")
        let source = app.buttons["Cenu avots"]
        reveal(source, in: scroll)
        source.tap()
        let note = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Datu lejupielāde nemaina")).firstMatch
        reveal(note, in: scroll)
        XCTAssertTrue(note.label.contains("2026"))
        XCTAssertTrue(note.label.contains("Tās var būt mainījušās"))
        assertWithinWidth(note, app: app)
        capture(app, name: "Product maximum text source and original date")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(app.buttons["venue-the-snuggest"].isHittable)
    }

    @MainActor func testProductMultipackQuoteAtMaximumText() {
        let app = product(query: "Corona Extra x6", venueID: "osm-node-1316197370", maximumText: true)
        let quote = app.staticTexts["venue-selected-price"]
        let volume = app.staticTexts["venue-selected-volume"]
        XCTAssertTrue(quote.label.contains("22,50"))
        XCTAssertEqual(volume.label, "6 × 330 ml")
        XCTAssertGreaterThanOrEqual(volume.frame.minY, quote.frame.maxY)
        assertWithinWidth(quote, app: app)
        assertWithinWidth(volume, app: app)
        capture(app, name: "Product maximum text exact six bottle quote")
        let heading = app.staticTexts["venue-menu-heading"]
        reveal(heading, in: app.scrollViews["venue-detail-scroll"])
        XCTAssertEqual(app.staticTexts["venue-menu-count"].label, "32 porcijas")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(app.buttons["venue-osm-node-1316197370"].isHittable)
    }

    @MainActor private func product(query: String, venueID: String, maximumText: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline", maximumText ? "--test-dark" : "--test-light"]
        if maximumText {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        }
        app.launch()
        app.tabBars.buttons["Vietas"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText(query + "\n")
        let venue = app.buttons["venue-" + venueID]
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        venue.tap()
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        return app
    }

    @MainActor private func reveal(_ element: XCUIElement, in scroll: XCUIElement) {
        let app = XCUIApplication()
        for _ in 0..<18 {
            // SwiftUI may report the scroll content beyond a sheet's visible
            // screen bounds. Gesture and assertion coordinates use the viewport.
            let viewport = scroll.frame.intersection(app.frame)
            if element.exists && element.isHittable && element.frame.minY >= viewport.minY + 60 && element.frame.maxY < viewport.maxY - 12 { return }
            let downward = element.exists && element.frame.minY < viewport.minY + 60
            let origin = app.coordinate(withNormalizedOffset: .zero)
            let start = origin.withOffset(CGVector(dx: viewport.midX, dy: viewport.minY + viewport.height * (downward ? 0.4 : 0.75)))
            let end = origin.withOffset(CGVector(dx: viewport.midX, dy: viewport.minY + viewport.height * (downward ? 0.75 : 0.4)))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        let viewport = scroll.frame.intersection(app.frame)
        XCTAssertTrue(element.isHittable, "Could not reveal \(element.identifier)")
        XCTAssertGreaterThanOrEqual(element.frame.minY, viewport.minY + 60)
        XCTAssertLessThan(element.frame.maxY, viewport.maxY - 12)
    }

    @MainActor private func assertWithinWidth(_ element: XCUIElement, app: XCUIApplication) {
        XCTAssertGreaterThanOrEqual(element.frame.minX, app.frame.minX + 16)
        XCTAssertLessThanOrEqual(element.frame.maxX, app.frame.maxX - 16)
    }

    @MainActor private func capture(_ app: XCUIApplication, name: String) {
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + " geometry"
        tree.lifetime = .keepAlways
        add(tree)
    }
}
