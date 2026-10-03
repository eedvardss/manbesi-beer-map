import XCTest
import CoreLocation
@testable import BeerMap

final class LocationProviderTests: XCTestCase {
    @MainActor func testUnrequestedAuthorizationAndLocationCallbacksStayQuiet() {
        let manager = TestLocationManager(status: .denied)
        let location = LocationProvider(manager: manager)
        location.authorizationChanged(to: .denied)
        location.authorizationChanged(to: .restricted)
        location.received(Coordinate(lat: 56.95, lng: 24.11))
        location.failed(permissionDenied: true)
        XCTAssertNil(location.feedback)
        XCTAssertNil(location.coordinate)
        XCTAssertFalse(location.isLocating)
        XCTAssertEqual(manager.authorizationRequests, 0)
        XCTAssertEqual(manager.positionRequests, 0)
        XCTAssertEqual(manager.desiredAccuracy, kCLLocationAccuracyHundredMeters)
        XCTAssertTrue(manager.delegate === location)
    }

    @MainActor func testAuthorizationAndRepeatedTapsStartOnlyOnePositionRequest() {
        let manager = TestLocationManager(status: .notDetermined)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        location.locate(for: UUID())
        XCTAssertTrue(location.isLocating)
        XCTAssertEqual(manager.authorizationRequests, 1)
        XCTAssertEqual(manager.positionRequests, 0)
        location.authorizationChanged(to: .notDetermined)
        manager.authorizationStatus = .authorizedWhenInUse
        location.authorizationChanged(to: .authorizedWhenInUse)
        location.authorizationChanged(to: .authorizedWhenInUse)
        location.locate(for: UUID())
        XCTAssertEqual(manager.positionRequests, 1)
        let position = Coordinate(lat: 56.95, lng: 24.11)
        location.received(position)
        XCTAssertEqual(location.coordinate, position)
        XCTAssertFalse(location.isLocating)
        XCTAssertNil(location.feedback)
        location.failed(permissionDenied: false)
        XCTAssertNil(location.feedback)
    }

    @MainActor func testSystemDenialIsRespectedAndOnlyANewTapOffersSettings() {
        let manager = TestLocationManager(status: .notDetermined)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        manager.authorizationStatus = .denied
        location.authorizationChanged(to: .denied)
        XCTAssertFalse(location.isLocating)
        XCTAssertNil(location.feedback)
        location.locate(for: owner)
        XCTAssertEqual(location.feedback?.owner, owner)
        XCTAssertEqual(location.feedback?.issue, .denied)
        XCTAssertTrue(location.feedback!.issue.offersSettings)
        XCTAssertFalse(location.feedback!.issue.offersRetry)
        XCTAssertEqual(manager.authorizationRequests, 1)
        XCTAssertEqual(manager.positionRequests, 0)
        location.dismissFeedback(for: UUID())
        XCTAssertNotNil(location.feedback)
        location.dismissFeedback(for: owner)
        XCTAssertNil(location.feedback)
        location.authorizationChanged(to: .denied)
        XCTAssertNil(location.feedback)
    }

    @MainActor func testRestrictedAccessDoesNotOfferUnusableSettingsOrRetry() {
        let manager = TestLocationManager(status: .restricted)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        XCTAssertEqual(location.feedback?.owner, owner)
        XCTAssertEqual(location.feedback?.issue, .restricted)
        XCTAssertFalse(location.feedback!.issue.offersSettings)
        XCTAssertFalse(location.feedback!.issue.offersRetry)
        XCTAssertFalse(location.isLocating)
        XCTAssertEqual(manager.authorizationRequests, 0)
        XCTAssertEqual(manager.positionRequests, 0)
    }

    @MainActor func testFailedOneShotCanRetryWithoutRetainingFailure() {
        let manager = TestLocationManager(status: .authorizedWhenInUse)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        location.authorizationChanged(to: .authorizedWhenInUse)
        location.failed(permissionDenied: false)
        XCTAssertEqual(location.feedback?.owner, owner)
        XCTAssertEqual(location.feedback?.issue, .unavailable)
        XCTAssertTrue(location.feedback!.issue.offersRetry)
        XCTAssertFalse(location.isLocating)
        location.locate(for: owner)
        XCTAssertNil(location.feedback)
        XCTAssertTrue(location.isLocating)
        XCTAssertEqual(manager.positionRequests, 2)
        location.received(Coordinate(lat: 56.96, lng: 24.12))
        XCTAssertFalse(location.isLocating)
        XCTAssertNil(location.feedback)
    }

    @MainActor func testRevokedPermissionClearsCoordinateWithoutAnIdleWarning() {
        let manager = TestLocationManager(status: .authorizedAlways)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        location.received(Coordinate(lat: 56.95, lng: 24.11))
        manager.authorizationStatus = .denied
        location.authorizationChanged(to: .denied)
        XCTAssertNil(location.coordinate)
        XCTAssertNil(location.feedback)
        manager.authorizationStatus = .authorizedWhenInUse
        location.locate(for: owner)
        manager.authorizationStatus = .restricted
        location.authorizationChanged(to: .restricted)
        XCTAssertEqual(location.feedback?.owner, owner)
        XCTAssertEqual(location.feedback?.issue, .restricted)
        XCTAssertFalse(location.isLocating)
        location.received(Coordinate(lat: 56.96, lng: 24.12))
        XCTAssertNil(location.coordinate)
    }

    @MainActor func testDismissingAnOldAlertDoesNotEraseNewFeedback() throws {
        let manager = TestLocationManager(status: .denied)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        let previous = try XCTUnwrap(location.feedback)
        location.locate(for: owner)
        let current = try XCTUnwrap(location.feedback)
        XCTAssertNotEqual(previous.id, current.id)
        location.dismissFeedback(for: owner, matching: previous.id)
        XCTAssertEqual(location.feedback, current)
        location.dismissFeedback(for: owner, matching: current.id)
        XCTAssertNil(location.feedback)
    }

    @MainActor func testDisabledServicesAndEmptyFixHaveAccurateRecovery() {
        let manager = TestLocationManager(status: .authorizedWhenInUse)
        let location = LocationProvider(manager: manager)
        let owner = UUID()
        location.locate(for: owner)
        location.failed(permissionDenied: true)
        XCTAssertEqual(location.feedback?.issue, .servicesUnavailable)
        XCTAssertFalse(location.feedback!.issue.offersSettings)
        XCTAssertTrue(location.feedback!.issue.offersRetry)
        location.locate(for: owner)
        location.received(nil)
        XCTAssertEqual(location.feedback?.issue, .unavailable)
        XCTAssertFalse(location.isLocating)
        XCTAssertNil(location.coordinate)
        XCTAssertEqual(manager.positionRequests, 2)
    }
}

@MainActor private final class TestLocationManager: LocationManaging {
    var authorizationStatus: CLAuthorizationStatus
    weak var delegate: (any CLLocationManagerDelegate)?
    var desiredAccuracy: CLLocationAccuracy = 0
    var authorizationRequests = 0
    var positionRequests = 0
    init(status: CLAuthorizationStatus) { authorizationStatus = status }
    func requestWhenInUseAuthorization() { authorizationRequests += 1 }
    func requestLocation() { positionRequests += 1 }
}
