import XCTest

final class LocationUITests: XCTestCase {
    @MainActor func testDeniedLocationRecoveryInLightAppearance() {
        verifyDeniedLocation(style: "Light", checkSettingsLaunchAndFilterSheet: true)
    }

    @MainActor func testDeniedLocationRecoveryInDarkAppearance() {
        verifyDeniedLocation(style: "Dark")
    }

    @MainActor func testDeniedLocationRecoveryWithLargestText() {
        verifyDeniedLocation(style: "Dark", textCategory: "UICTContentSizeCategoryAccessibilityXXXL")
    }

    @MainActor private func verifyDeniedLocation(style: String, textCategory: String? = nil,
                                                 checkSettingsLaunchAndFilterSheet: Bool = false) {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .location)
        defer { app.terminate(); app.resetAuthorizationStatus(for: .location) }
        app.launchArguments = ["--uitesting", "--offline", style == "Dark" ? "--test-dark" : "--test-light"]
        if let textCategory { app.launchArguments += ["-UIPreferredContentSizeCategoryName", textCategory] }
        app.launch()
        let locate = app.buttons["locate"]
        let map = app.otherElements["venue-map"]
        let legal = app.links["Legal"]
        XCTAssertTrue(locate.waitForExistence(timeout: 10))
        XCTAssertFalse(app.alerts.firstMatch.exists)
        locate.tap()
        let permission = XCUIApplication(bundleIdentifier: "com.apple.springboard").alerts.firstMatch
        XCTAssertTrue(permission.waitForExistence(timeout: 10))
        let deny = permission.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Don't Allow", "Don’t Allow")).firstMatch
        XCTAssertTrue(deny.exists)
        deny.tap()
        let stopped = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in locate.isEnabled }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [stopped], timeout: 5), .completed)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertFalse(app.staticTexts["Atrašanās vieta nav pieejama. Karti vari izmantot arī bez tās."].exists)
        XCTAssertGreaterThan(map.frame.height, 200)
        XCTAssertTrue(map.frame.contains(legal.frame))
        capture(app, name: "Location denial keeps the map useful - \(style) - \(textCategory ?? "default")")

        // Core Location invokes its authorization delegate at initialization.
        // A fresh launch with a prior denial must remain equally quiet.
        app.terminate()
        app.launch()
        XCTAssertTrue(map.waitForExistence(timeout: 10))
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertFalse(app.staticTexts["Atrašanās vieta nav pieejama. Karti vari izmantot arī bez tās."].exists)
        XCTAssertGreaterThan(map.frame.height, 200)
        if textCategory != nil { XCTAssertGreaterThan(app.staticTexts["165 vietas"].frame.height, 30) }
        let before = map.frame
        capture(app, name: "Quiet cold launch after denial - \(style) - \(textCategory ?? "default")")
        locate.tap()
        let recovery = app.alerts["Nav atļaujas"]
        XCTAssertTrue(recovery.waitForExistence(timeout: 5))
        XCTAssertEqual(app.alerts.count, 1)
        XCTAssertTrue(recovery.buttons["Atvērt iestatījumus"].isHittable)
        XCTAssertTrue(recovery.buttons["Atcelt"].isHittable)
        let explanation = recovery.staticTexts["Atļauj atrašanās vietu iestatījumos."]
        XCTAssertTrue(explanation.isHittable)
        XCTAssertLessThanOrEqual(explanation.frame.maxY, recovery.buttons["Atvērt iestatījumus"].frame.minY)
        capture(app, name: "Explicit location recovery - \(style) - \(textCategory ?? "default")")
        recovery.buttons["Atcelt"].tap()
        XCTAssertFalse(recovery.exists)
        XCTAssertEqual(map.frame.height, before.height, accuracy: 1)
        XCTAssertTrue(locate.isHittable)
        XCTAssertFalse(legal.frame.intersects(app.otherElements["map-overview-status"].frame))

        if checkSettingsLaunchAndFilterSheet {
            locate.tap()
            XCTAssertTrue(recovery.waitForExistence(timeout: 5))
            recovery.buttons["Atvērt iestatījumus"].tap()
            let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
            XCTAssertTrue(settings.wait(for: .runningForeground, timeout: 10))
            XCTAssertTrue(settings.navigationBars.firstMatch.waitForExistence(timeout: 10))
            // The supported URL opens Settings, but iOS 26.5 Simulator
            // resolves it to the Settings root. Do not claim a verified
            // app-specific destination or change privacy settings here.
            capture(settings, name: "Supported Settings URL opens Settings - app destination remains unverified")
            app.activate()
            XCTAssertTrue(locate.waitForExistence(timeout: 5))
            XCTAssertFalse(app.alerts.firstMatch.exists)
            XCTAssertEqual(map.frame.height, before.height, accuracy: 1)
            app.buttons["filters"].tap()
            let filterLocate = app.buttons["filter-locate"]
            XCTAssertTrue(filterLocate.waitForExistence(timeout: 5))
            filterLocate.tap()
            XCTAssertTrue(recovery.waitForExistence(timeout: 5))
            XCTAssertEqual(app.alerts.count, 1)
            capture(app, name: "Denied-location recovery belongs to the active filter sheet")
            recovery.buttons["Atcelt"].tap()
            XCTAssertTrue(filterLocate.isHittable)
            app.buttons["Gatavs"].tap()
            XCTAssertTrue(locate.isHittable)
            XCTAssertFalse(app.alerts.firstMatch.exists)
        }
        let halfLitre = app.buttons["500 ml"]
        if textCategory != nil { app.scrollViews.containing(.button, identifier: "500 ml").firstMatch.swipeLeft() }
        XCTAssertTrue(halfLitre.isHittable)
        halfLitre.tap()
        XCTAssertTrue(app.staticTexts["131 vietas"].waitForExistence(timeout: 5))
        XCTAssertGreaterThan(map.frame.height, 200)
    }

    @MainActor private func capture(_ app: XCUIApplication, name: String) {
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + " geometry"
        tree.lifetime = .keepAlways
        add(tree)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
