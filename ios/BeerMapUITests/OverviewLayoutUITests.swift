import XCTest

// Protect the observed narrow price/name columns and keyboard-covered results.
// All quotes use the real bundled catalog, including unknown sizes and packs.
final class OverviewLayoutUITests: XCTestCase {
#if DEBUG
    @MainActor func testDraftOverviewAndKeyboardAtMaximumText() {
        let app = XCUIApplication()
        for variant in ["A", "B", "C"] {
            app.launchArguments = ["--uitesting", "--design-study", "--design=" + variant, variant == "B" ? "--design-light" : "--design-dark", "--design-max-text"]
            app.launch()
            let search = app.textFields["study-search"]
            XCTAssertTrue(search.waitForExistence(timeout: 10))
            capture(app, name: "Draft " + variant + " maximum text overview")
            search.tap()
            search.typeText("Tallink")
            XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
            let venue = app.buttons["study-venue-tallink-riga-lobby-bar"]
            XCTAssertTrue(venue.waitForExistence(timeout: 5))
            let scroll = draftScroll(app, variant: variant)
            let viewport = visibleViewport(scroll, app: app)
            XCTAssertGreaterThan(viewport.height, 140)
            if variant != "B" { XCTAssertLessThan(search.frame.maxY, viewport.minY + 1) }
            XCTAssertLessThan(search.frame.maxY, viewport.maxY - 40)
            if variant == "A" { XCTAssertGreaterThan(app.otherElements["venue-map"].frame.height, 100) }
            XCTAssertFalse(app.otherElements["study-switcher"].exists)
            capture(app, name: "Draft " + variant + " maximum text useful keyboard results")
            tapVisiblePart(venue, in: viewport, app: app)
            XCTAssertTrue(app.staticTexts["study-detail-name"].waitForExistence(timeout: 5))
            XCTAssertEqual(app.staticTexts["study-detail-name"].label, "Lobby Bar — Tallink Hotel Riga")
            app.buttons["study-close-detail"].tap()
            XCTAssertEqual(search.value as? String, "Tallink")
            if variant == "A" {
                app.buttons["study-expand-places"].tap()
                let legal = app.links["Legal"]
                XCTAssertTrue(legal.waitForExistence(timeout: 5))
                XCTAssertGreaterThan(app.otherElements["venue-map"].frame.height, 160)
                XCTAssertGreaterThan(legal.frame.minY, search.frame.maxY + 8)
            }
            let name = app.staticTexts["study-row-name-tallink-riga-lobby-bar"]
            let price = app.staticTexts["study-row-price-tallink-riga-lobby-bar"]
            let volume = app.staticTexts["study-row-volume-tallink-riga-lobby-bar"]
            XCTAssertTrue(name.exists)
            XCTAssertGreaterThan(name.frame.width, 250)
            XCTAssertLessThan(name.frame.height, 240)
            XCTAssertGreaterThanOrEqual(price.frame.minY, name.frame.maxY)
            XCTAssertTrue(price.label.contains("6,00"))
            XCTAssertTrue(volume.label.contains("500 ml"))
            reveal(price, in: scroll, app: app)
            assertWithinWidth(price, app: app)
            capture(app, name: "Draft " + variant + " maximum text complete result quote")
            if variant == "C" {
                let controls = app.scrollViews["study-comparison-controls"]
                let origin = app.coordinate(withNormalizedOffset: .zero)
                let start = origin.withOffset(CGVector(dx: app.frame.maxX - 30, dy: controls.frame.midY))
                let end = origin.withOffset(CGVector(dx: 30, dy: controls.frame.midY))
                start.press(forDuration: 0.05, thenDragTo: end)
                let litre = app.buttons["Par litru"]
                XCTAssertTrue(litre.isHittable)
                litre.tap()
                XCTAssertTrue(price.label.contains("12,00"))
                XCTAssertTrue(price.label.contains("/l"))
                reveal(price, in: scroll, app: app)
                capture(app, name: "Draft C maximum text accessible litre comparison")
            }
            app.terminate()
        }
    }

    @MainActor func testDraftOrdinaryRowsInLightAppearance() {
        let app = XCUIApplication()
        for variant in ["A", "B", "C"] {
            app.launchArguments = ["--uitesting", "--design-study", "--design=" + variant, "--design-light"]
            app.launch()
            let search = app.textFields["study-search"]
            XCTAssertTrue(search.waitForExistence(timeout: 10))
            search.tap()
            search.typeText("Tallink\n")
            let name = app.staticTexts["study-row-name-tallink-riga-lobby-bar"]
            let price = app.staticTexts["study-row-price-tallink-riga-lobby-bar"]
            XCTAssertTrue(name.waitForExistence(timeout: 5))
            XCTAssertTrue(price.label.contains("6,00"))
            XCTAssertGreaterThan(price.frame.minX, name.frame.maxX)
            XCTAssertLessThan(abs(price.frame.minY - name.frame.minY), 8)
            capture(app, name: "Draft " + variant + " ordinary light compact result")
            app.terminate()
        }
    }
#endif

    @MainActor func testProductListAndKeyboardAtMaximumText() {
        let app = product(maximumText: true)
        let search = app.searchFields.firstMatch
        search.tap()
        search.typeText("Snuggest")
        let venue = app.buttons["venue-the-snuggest"]
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        XCTAssertTrue(app.keyboards.firstMatch.exists)
        let list = app.collectionViews["places-list"]
        let viewport = visibleViewport(list, app: app)
        XCTAssertLessThan(app.staticTexts["row-name-the-snuggest"].frame.minY, viewport.maxY - 40)
        capture(app, name: "Product maximum text visible result above keyboard")
        tapVisiblePart(venue, in: viewport, app: app)
        XCTAssertTrue(app.staticTexts["venue-detail-name"].waitForExistence(timeout: 5))
        app.buttons["close-detail"].tap()
        XCTAssertEqual(search.value as? String, "Snuggest")
        let name = app.staticTexts["row-name-the-snuggest"]
        let price = app.staticTexts["row-price-the-snuggest"]
        let volume = app.staticTexts["row-volume-the-snuggest"]
        XCTAssertGreaterThan(name.frame.width, 240)
        XCTAssertLessThan(name.frame.height, 200)
        XCTAssertEqual(volume.label, "Tilpums nav norādīts")
        XCTAssertTrue(price.label.contains("5,00"))
        XCTAssertGreaterThanOrEqual(price.frame.minY, volume.frame.maxY)
        reveal(price, in: list, app: app)
        assertWithinWidth(price, app: app)
        capture(app, name: "Product maximum text complete unknown serving quote")
        let save = app.buttons["save-the-snuggest"]
        reveal(save, in: list, app: app)
        // Tap beside the small glyph, inside its complete 44-point target.
        let origin = app.coordinate(withNormalizedOffset: .zero)
        origin.withOffset(CGVector(dx: save.frame.midX + 17, dy: save.frame.midY)).tap()
        XCTAssertTrue(save.label.hasPrefix("Noņemt no saglabātā"))
        app.tabBars.buttons["Saglabāts"].tap()
        XCTAssertTrue(venue.waitForExistence(timeout: 5))
        capture(app, name: "Product maximum text saved search context")
    }

    @MainActor func testProductMultipackResultAtMaximumText() {
        let app = product(maximumText: true)
        let search = app.searchFields.firstMatch
        search.tap()
        search.typeText("Corona Extra x6\n")
        let volume = app.staticTexts["row-volume-osm-node-1316197370"]
        let price = app.staticTexts["row-price-osm-node-1316197370"]
        XCTAssertTrue(volume.waitForExistence(timeout: 5))
        XCTAssertEqual(volume.label, "6 × 330 ml")
        XCTAssertTrue(price.label.contains("22,50"))
        XCTAssertGreaterThanOrEqual(price.frame.minY, volume.frame.maxY)
        reveal(price, in: app.collectionViews["places-list"], app: app)
        assertWithinWidth(volume, app: app)
        assertWithinWidth(price, app: app)
        capture(app, name: "Product maximum text exact six bottle list quote")
    }

    @MainActor func testProductOrdinaryPriceColumn() {
        let app = product(maximumText: false)
        let search = app.searchFields.firstMatch
        search.tap()
        search.typeText("ALA Pagrabs\n")
        let name = app.staticTexts["row-name-folkklubs-ala-pagrabs"]
        let price = app.staticTexts["row-price-folkklubs-ala-pagrabs"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(price.frame.minX, name.frame.maxX)
        XCTAssertEqual(price.frame.minY, name.frame.minY, accuracy: 1)
        XCTAssertEqual(app.staticTexts["row-volume-folkklubs-ala-pagrabs"].label, "300 ml")
        XCTAssertTrue(price.label.contains("2,80"))
        capture(app, name: "Product ordinary light compact price column")
    }

    @MainActor private func product(maximumText: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--offline", maximumText ? "--test-dark" : "--test-light"]
        if maximumText { app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] }
        app.launch()
        app.tabBars.buttons["Vietas"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        return app
    }

#if DEBUG
    @MainActor private func draftScroll(_ app: XCUIApplication, variant: String) -> XCUIElement {
        app.scrollViews[variant == "A" ? "study-map-results" : (variant == "B" ? "study-guide-results" : "study-comparison-results")]
    }
#endif

    @MainActor private func visibleViewport(_ scroll: XCUIElement, app: XCUIApplication) -> CGRect {
        // SwiftUI can expose a scroll's full content frame, including content
        // hidden by a keyboard or bottom controls. Use the visible app bounds.
        var viewport = scroll.frame.intersection(app.frame)
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists && keyboard.frame.intersects(app.frame) {
            // iOS exposes the predictive input bar separately from Keyboard.
            viewport.size.height = max(0, min(viewport.maxY, keyboard.frame.minY - 44) - viewport.minY)
        } else {
            let tab = app.tabBars.firstMatch
            let switcher = app.otherElements["study-switcher"]
            let mapAction = app.buttons["study-show-map"]
            for control in [tab, switcher, mapAction] where control.exists {
                viewport.size.height = max(0, min(viewport.maxY, control.frame.minY) - viewport.minY)
            }
        }
        let navigation = app.navigationBars.firstMatch
        if navigation.exists {
            let bottom = viewport.maxY
            viewport.origin.y = max(viewport.minY, navigation.frame.maxY)
            viewport.size.height = max(0, bottom - viewport.minY)
        }
        return viewport
    }

    @MainActor private func tapVisiblePart(_ element: XCUIElement, in viewport: CGRect, app: XCUIApplication) {
        let visible = element.frame.intersection(viewport)
        XCTAssertGreaterThan(visible.height, 30)
        let origin = app.coordinate(withNormalizedOffset: .zero)
        origin.withOffset(CGVector(dx: visible.minX + 40, dy: visible.minY + 20)).tap()
    }

    @MainActor private func reveal(_ element: XCUIElement, in scroll: XCUIElement, app: XCUIApplication) {
        waitForStableFrame(element)
        for _ in 0..<12 {
            let viewport = visibleViewport(scroll, app: app)
            let frame = element.frame
            if element.exists && element.isHittable && frame.minY >= viewport.minY + 12 && frame.maxY < viewport.maxY - 12 { return }
            let downward = element.exists && frame.minY < viewport.minY + 12
            let delta = downward ? viewport.minY + 12 - frame.minY : frame.maxY - (viewport.maxY - 12)
            let amount = min(max(delta + 8, 24), viewport.height * 0.45)
            let startY = viewport.minY + viewport.height * (downward ? 0.35 : 0.8)
            let endY = startY + (downward ? amount : -amount)
            let origin = app.coordinate(withNormalizedOffset: .zero)
            let start = origin.withOffset(CGVector(dx: viewport.midX, dy: startY))
            let end = origin.withOffset(CGVector(dx: viewport.midX, dy: endY))
            start.press(forDuration: 0.05, thenDragTo: end)
            waitForStableFrame(element)
        }
        let viewport = visibleViewport(scroll, app: app)
        XCTAssertTrue(element.isHittable)
        XCTAssertGreaterThanOrEqual(element.frame.minY, viewport.minY + 12)
        XCTAssertLessThan(element.frame.maxY, viewport.maxY - 12)
    }

    @MainActor private func waitForStableFrame(_ element: XCUIElement) {
        var priorFrame: CGRect?
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            let frame = element.frame
            defer { priorFrame = frame }
            return frame == priorFrame && frame.height > 0
        }, object: element)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 5), .completed)
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
