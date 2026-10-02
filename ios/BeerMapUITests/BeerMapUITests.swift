import XCTest

final class BeerMapUITests: XCTestCase {
#if DEBUG
    // This check protects the sheet environment and full-row tap area, both
    // of which failed during rendered review of the throwaway native study.
    @MainActor func testDesignStudySearchDetailsBookmarksAndModeSwitch() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A"]
        app.launch()
        let search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("ALA Pagrabs\n")
        let venue = app.buttons["study-venue-folkklubs-ala-pagrabs"]
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        venue.tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["study-directions"].exists)
        app.navigationBars.buttons["save-folkklubs-ala-pagrabs"].tap()
        app.buttons["study-close-detail"].tap()
        app.buttons["study-clear-search"].tap()
        app.buttons["Rādīt saglabātās vietas"].tap()
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        capture(app, name: "Draft saved place")
        app.buttons["Rādīt visas vietas"].tap()
        app.buttons["design-next"].tap()
        XCTAssertTrue(app.staticTexts["Vieta vakaram."].waitForExistence(timeout: 5))
        app.buttons["design-next"].tap()
        XCTAssertTrue(app.staticTexts["Salīdzini."].waitForExistence(timeout: 5))
        let comparisonSearch = app.textFields["study-search"]
        comparisonSearch.tap()
        comparisonSearch.typeText("ALA Pagrabs\n")
        app.buttons["500 ml"].tap()
        app.buttons["Par litru"].tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "6,30")).firstMatch.waitForExistence(timeout: 5))
        let mapAction = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Skatīt karti")).firstMatch
        mapAction.tap()
        XCTAssertTrue(app.staticTexts["A · Karte"].waitForExistence(timeout: 5))
        comparisonSearch.tap()
        app.buttons["study-clear-search"].tap()
        comparisonSearch.typeText("no-such-beer-xyz\n")
        XCTAssertTrue(app.staticTexts["Nekas neatradās."].waitForExistence(timeout: 5))
        app.buttons["Notīrīt filtrus"].tap()
        app.buttons["study-expand-places"].tap()
        XCTAssertTrue(app.buttons["study-venue-banshee"].waitForExistence(timeout: 5))
    }



    @MainActor func testDesignClusterZoomPinAndAppearanceContinuity() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-light"]
        app.launch()
        let map = app.otherElements["venue-map"]
        let clusters = app.buttons.matching(identifier: "map-cluster")
        let summary = app.staticTexts["study-map-summary"]
        XCTAssertTrue(map.waitForExistence(timeout: 10))
        XCTAssertTrue(clusters.firstMatch.waitForExistence(timeout: 10))
        capture(app, name: "Draft price and cluster hierarchy in light appearance")
        let mapFrame = map.frame
        func visible(_ element: XCUIElement) -> Bool {
            let frame = element.frame
            guard frame.width > 0, frame.height > 0, frame.minY > mapFrame.minY + 60,
                  frame.maxY < mapFrame.maxY - 12 else { return false }
            return element.isHittable
        }
        let beforeArea = summary.label
        let cluster = try XCTUnwrap(clusters.allElementsBoundByIndex.filter(visible).min {
            abs($0.frame.midY - mapFrame.midY) < abs($1.frame.midY - mapFrame.midY)
        })
        cluster.tap()
        let zoomed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            summary.label != beforeArea
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [zoomed], timeout: 10), .completed)
        capture(app, name: "Draft zoomed place prices and area membership")

        // MapKit can expose clustered child annotations in its AX tree.
        // Filter to a real single venue before testing an individual pin.
        let search = app.textFields["study-search"]
        search.tap()
        search.typeText("Duvel\n")
        let pin = app.buttons["pin-duvels"]
        XCTAssertTrue(pin.waitForExistence(timeout: 5))
        var priorFrame: CGRect?
        let settledPin = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let frame = pin.frame
            defer { priorFrame = frame }
            return frame == priorFrame && frame.width > 0 && frame.minY > mapFrame.minY + 60
                && frame.maxY < mapFrame.maxY - 12
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [settledPin], timeout: 5), .completed)
        let before = pin.frame
        pin.tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["study-detail-name"].label, "Duvel’s")
        app.buttons["study-close-detail"].tap()
        XCTAssertTrue(pin.waitForExistence(timeout: 5))
        XCTAssertEqual(pin.frame.midX, before.midX, accuracy: 2)
        XCTAssertEqual(pin.frame.midY, before.midY, accuracy: 2)
        app.buttons["Skices izskats un teksta izmērs"].tap()
        app.buttons["Tumšs izskats"].tap()
        XCTAssertTrue(pin.isHittable)
        XCTAssertEqual(pin.frame.midX, before.midX, accuracy: 2)
        XCTAssertEqual(pin.frame.midY, before.midY, accuracy: 2)
        capture(app, name: "Retained price marker after dark appearance change")

        app.terminate()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-dark", "--design-large-text"]
        app.launch()
        XCTAssertTrue(clusters.firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(summary.exists)
        capture(app, name: "Draft dark map and accessible place panel")
    }

    @MainActor func testDesignGroupedMenuAndAccessiblePriceSource() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-light"]
        app.launch()
        var search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("ALA Pagrabs\n")
        app.buttons["study-venue-folkklubs-ala-pagrabs"].tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        var source = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Avots ·")).firstMatch
        let count = app.staticTexts["study-menu-count"]
        let regularPriceHeight = app.staticTexts["study-selected-price"].frame.height
        XCTAssertTrue(source.isHittable)
        XCTAssertEqual(count.label, "73 porcijas")
        XCTAssertLessThan(source.frame.maxY, app.buttons["study-directions"].frame.minY)
        let largeServing = app.otherElements.matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label BEGINSWITH %@", "study-serving-", "Brālis rūgtais, 3000 ml")).firstMatch
        XCTAssertTrue(largeServing.exists)
        XCTAssertTrue(largeServing.label.contains("18,90"))
        XCTAssertEqual(app.otherElements.matching(identifier: "venue-map").count, 1)
        capture(app, name: "Grouped complete menu with contextual source")
        source.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Lejupielāde nemaina")).firstMatch.exists)
        source.tap()
        app.buttons["study-close-detail"].tap()
        XCTAssertTrue(app.buttons["study-venue-folkklubs-ala-pagrabs"].isHittable)

        app.terminate()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-dark", "--design-large-text"]
        app.launch()
        search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("Tallink\n")
        app.buttons["study-venue-tallink-riga-lobby-bar"].tap()
        let title = app.staticTexts["study-detail-name"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertTrue(title.label.contains("Tallink Hotel Riga"))
        XCTAssertGreaterThan(title.frame.height, 40)
        XCTAssertGreaterThan(app.staticTexts["study-selected-price"].frame.height, regularPriceHeight + 8)
        XCTAssertGreaterThanOrEqual(title.frame.minX, app.frame.minX)
        XCTAssertLessThanOrEqual(title.frame.maxX, app.frame.maxX)
        capture(app, name: "Long venue name and exact serving at large text")
        source = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Avots ·")).firstMatch
        let scroll = app.scrollViews["study-detail-scroll"]
        for _ in 0..<4 {
            if source.isHittable { break }
            scroll.swipeUp()
        }
        XCTAssertTrue(source.isHittable)
        source.tap()
        let sourceNote = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Lejupielāde nemaina")).firstMatch
        let walking = app.buttons["study-directions"]
        var previousFrame: CGRect?
        let stableDisclosure = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let frame = walking.frame
            defer { previousFrame = frame }
            return frame == previousFrame && sourceNote.exists && sourceNote.frame.maxY <= frame.minY
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [stableDisclosure], timeout: 5), .completed)
        capture(app, name: "Accessible source disclosure")
        source.tap()
        scroll.swipeUp()
        XCTAssertTrue(app.staticTexts["study-menu-count"].exists)
        capture(app, name: "Grouped menu at large text")
    }

    @MainActor func testDesignMapAreaAllPlacesAndSavedContext() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-dark", "--design-large-text"]
        app.launch()
        let map = app.otherElements["venue-map"]
        let summary = app.staticTexts["study-map-summary"]
        XCTAssertTrue(map.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Šajā apgabalā"].exists)
        app.buttons["study-expand-places"].tap()
        XCTAssertTrue(app.staticTexts["Visas vietas"].exists)
        XCTAssertTrue(summary.label.hasPrefix("131 vietas"))
        let fullSummary = summary.label
        let savedVenue = app.buttons["study-venue-1983-bars"]
        savedVenue.tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        app.navigationBars.buttons["save-1983-bars"].tap()
        app.buttons["study-close-detail"].tap()
        // Panning changes the map, but an explicitly expanded list keeps its
        // global membership and returning from detail keeps its position.
        XCTAssertTrue(savedVenue.isHittable)
        for _ in 0..<3 {
            let start = map.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5))
            let end = map.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.5))
            start.press(forDuration: 0.1, thenDragTo: end)
        }
        XCTAssertEqual(summary.label, fullSummary)
        app.buttons["Rādīt saglabātās vietas"].tap()
        XCTAssertTrue(app.staticTexts["Tavas vietas"].exists)
        XCTAssertTrue(summary.label.hasPrefix("1 vieta"))
        XCTAssertTrue(savedVenue.isHittable)
        capture(app, name: "Saved place outside map area")
        app.buttons["Rādīt visas vietas"].tap()
        app.buttons["study-expand-places"].tap()
        XCTAssertTrue(app.staticTexts["Šeit vietu nav."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Nekas neatradās."].exists)
        capture(app, name: "Empty map area")
        app.buttons["study-area-show-all"].tap()
        XCTAssertEqual(summary.label, fullSummary)
        XCTAssertTrue(savedVenue.isHittable)
    }

    @MainActor func testDesignExpandedSearchRetainsVisibleMap() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-dark", "--design-large-text"]
        app.launch()
        let search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        app.buttons["study-expand-places"].tap()
        search.tap()
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
        search.typeText("ALA Pagrabs")
        XCTAssertTrue(app.buttons["study-venue-folkklubs-ala-pagrabs"].waitForExistence(timeout: 5))
        XCTAssertTrue(search.isHittable)
        XCTAssertTrue(keyboard.isHittable)
        XCTAssertGreaterThan(keyboard.frame.height, 150)
        XCTAssertLessThanOrEqual(keyboard.frame.maxY, app.frame.maxY + 1)
        XCTAssertGreaterThan(app.otherElements["venue-map"].frame.height, 100)
        capture(app, name: "Expanded search and keyboard after typing")
        search.typeText("\n")
        XCTAssertTrue(app.staticTexts["study-map-summary"].label.hasPrefix("1 vieta"))
    }
#endif

    @MainActor func testPinDetailReturnsToSameMapPosition() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        app.launch()
        let pin = app.buttons["pin-hospitalu-ezitis-migla"]
        XCTAssertTrue(pin.waitForExistence(timeout: 10))
        XCTAssertTrue(pin.isHittable)
        let originalFrame = pin.frame
        capture(app, name: "Map before pin detail")
        pin.tap()
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        capture(app, name: "Pin detail preserves map context")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(pin.waitForExistence(timeout: 5))
        XCTAssertEqual(pin.frame.midX, originalFrame.midX, accuracy: 2)
        XCTAssertEqual(pin.frame.midY, originalFrame.midY, accuracy: 2)
        capture(app, name: "Map after pin detail")
    }

    @MainActor func testMapPlacesSavedAndServingFilters() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        app.launch()
        XCTAssertTrue(app.otherElements["venue-map"].waitForExistence(timeout: 15))
        capture(app, name: "Map")
        app.tabBars.buttons["Vietas"].tap()
        XCTAssertTrue(app.buttons["venue-banshee"].waitForExistence(timeout: 5))
        app.buttons["save-banshee"].tap()
        app.tabBars.buttons["Saglabāts"].tap()
        XCTAssertTrue(app.buttons["venue-banshee"].waitForExistence(timeout: 5))
        app.buttons["500 ml"].tap()
        XCTAssertTrue(app.staticTexts["500 ml"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["venue-banshee"].tap()
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["directions"].exists)
        capture(app, name: "Venue")
        app.buttons["close-detail"].tap()
        XCTAssertTrue(app.buttons["venue-banshee"].waitForExistence(timeout: 5))
        capture(app, name: "Saved")
    }

    @MainActor func testLitreComparisonSearchAndEmptyState() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline"]
        app.launch()
        app.tabBars.buttons["Vietas"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("ALA Pagrabs\n")
        app.buttons["filters"].tap()
        app.buttons["Lētākais litrs"].tap()
        app.buttons["Gatavs"].tap()
        let ala = app.buttons["venue-folkklubs-ala-pagrabs"]
        XCTAssertTrue(ala.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "6,30")).firstMatch.exists)
        capture(app, name: "Litre comparison")
        ala.tap()
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        app.buttons["close-detail"].tap()
        search.tap()
        search.buttons.firstMatch.tap()
        search.typeText("no-such-beer-xyz\n")
        XCTAssertTrue(app.staticTexts["Nekas neatradās"].waitForExistence(timeout: 5))
        capture(app, name: "Empty search")
    }

    @MainActor private func capture(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
