import XCTest

// A real filtered price must remain visible between search and map attribution.
// These checks cover the small canvas left by large text, lists and keyboards.
final class DraftMapLayoutUITests: XCTestCase {
#if DEBUG
    @MainActor func testMaximumDarkMapKeepsFilteredPriceVisible() {
        checkFilteredPrice(appearance: "dark", textArgument: "--design-max-text")
    }

    @MainActor func testMaximumLightMapKeepsFilteredPriceVisible() {
        checkFilteredPrice(appearance: "light", textArgument: "--design-max-text")
    }

    @MainActor func testLargeDarkMapKeepsFilteredPriceVisible() {
        checkFilteredPrice(appearance: "dark", textArgument: "--design-large-text")
    }

    @MainActor func testOrdinaryLightMapKeepsFilteredPriceVisible() {
        checkFilteredPrice(appearance: "light", textArgument: nil)
    }

    @MainActor private func checkFilteredPrice(appearance: String, textArgument: String?) {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--design-study", "--design=A", "--design-" + appearance]
        if let textArgument { app.launchArguments.append(textArgument) }
        app.launch()
        let search = app.textFields["study-search"]
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        app.buttons["study-expand-places"].tap()
        search.tap()
        search.typeText("Tallink")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let pin = app.buttons["pin-tallink-riga-lobby-bar"]
        XCTAssertTrue(pin.waitForExistence(timeout: 5))
        settle(pin)
        capture(app, name: "Filtered price with keyboard " + appearance + " " + (textArgument ?? "ordinary"))
        assertVisiblePrice(pin, search: search, app: app)

        search.typeText("\n")
        XCTAssertTrue(app.buttons["study-expand-places"].waitForExistence(timeout: 5))
        settle(pin)
        capture(app, name: "Expanded filtered map " + appearance + " " + (textArgument ?? "ordinary"))
        assertVisiblePrice(pin, search: search, app: app)
        XCTAssertEqual(search.value as? String, "Tallink")
        XCTAssertEqual(pin.label.replacingOccurrences(of: "\u{00a0}", with: " "), "Lobby Bar — Tallink Hotel Riga, 6,00 €, 500 ml")
        let before = pin.frame
        pin.tap()
        XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["study-detail-name"].label, "Lobby Bar — Tallink Hotel Riga")
        app.buttons["study-close-detail"].tap()
        settle(pin)
        XCTAssertEqual(pin.frame.midX, before.midX, accuracy: 2)
        XCTAssertEqual(pin.frame.midY, before.midY, accuracy: 2)
        assertVisiblePrice(pin, search: search, app: app)
        capture(app, name: "Retained map after detail " + appearance + " " + (textArgument ?? "ordinary"))
    }

    @MainActor private func assertVisiblePrice(_ pin: XCUIElement, search: XCUIElement, app: XCUIApplication) {
        let map = app.otherElements["venue-map"]
        let legal = app.links["Legal"]
        XCTAssertTrue(legal.exists)
        XCTAssertGreaterThan(map.frame.height, 100)
        XCTAssertGreaterThanOrEqual(pin.frame.minY, max(map.frame.minY, search.frame.maxY) + 6)
        XCTAssertLessThanOrEqual(pin.frame.maxY, legal.frame.minY - 6)
        XCTAssertGreaterThanOrEqual(pin.frame.minX, map.frame.minX + 8)
        XCTAssertLessThanOrEqual(pin.frame.maxX, map.frame.maxX - 8)
        XCTAssertTrue(pin.isHittable)
    }

    @MainActor private func settle(_ element: XCUIElement) {
        var previous: CGRect?
        let stable = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let frame = element.frame
            defer { previous = frame }
            return frame.width > 0 && frame.height > 0 && frame == previous
        }, object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [stable], timeout: 5), .completed)
    }

    @MainActor private func capture(_ app: XCUIApplication, name: String) {
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + " geometry"
        tree.lifetime = .keepAlways
        add(tree)
    }
#endif
}
