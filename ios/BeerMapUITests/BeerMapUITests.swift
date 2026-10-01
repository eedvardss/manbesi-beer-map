import XCTest

final class BeerMapUITests: XCTestCase {
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
