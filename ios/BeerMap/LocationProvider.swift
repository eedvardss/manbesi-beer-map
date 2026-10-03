@preconcurrency import CoreLocation
import Observation

// A narrow system boundary lets permission/request transitions be checked
// without granting location access or requesting a real device position.
@MainActor protocol LocationManaging: AnyObject {
    var authorizationStatus: CLAuthorizationStatus { get }
    var delegate: (any CLLocationManagerDelegate)? { get set }
    var desiredAccuracy: CLLocationAccuracy { get set }
    func requestWhenInUseAuthorization()
    func requestLocation()
}

extension CLLocationManager: LocationManaging {}

enum LocationIssue: Equatable {
    case denied, restricted, unavailable, servicesUnavailable

    var title: String {
        switch self {
        case .denied: "Nav atļaujas"
        case .restricted: "Piekļuve ierobežota"
        case .unavailable: "Neizdevās noteikt vietu"
        case .servicesUnavailable: "Vieta nav pieejama"
        }
    }
    var message: String? {
        switch self {
        case .denied: "Atļauj atrašanās vietu iestatījumos."
        case .restricted: "Piekļuvi atrašanās vietai bloķē ierīces ierobežojumi."
        case .unavailable: nil
        case .servicesUnavailable: "Pārbaudi atrašanās vietas pakalpojumus."
        }
    }
    var offersSettings: Bool { self == .denied }
    var offersRetry: Bool { self == .unavailable || self == .servicesUnavailable }
}

struct LocationFeedback: Equatable {
    let id = UUID()
    let owner: UUID
    let issue: LocationIssue
}

@MainActor @Observable
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    private enum Request {
        case idle, authorization(UUID), position(UUID)
        var owner: UUID? {
            switch self { case .idle: nil; case .authorization(let owner), .position(let owner): owner }
        }
    }

    private(set) var coordinate: Coordinate?
    private(set) var feedback: LocationFeedback?
    private var request = Request.idle
    @ObservationIgnored private let manager: any LocationManaging
    var isLocating: Bool { request.owner != nil }

    init(manager: any LocationManaging = CLLocationManager()) {
        self.manager = manager
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func locate(for owner: UUID) {
        guard !isLocating else { return }
        feedback = nil
        switch manager.authorizationStatus {
        case .notDetermined:
            request = .authorization(owner)
            manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            requestPosition(for: owner)
        case .denied:
            coordinate = nil
            feedback = LocationFeedback(owner: owner, issue: .denied)
        case .restricted:
            coordinate = nil
            feedback = LocationFeedback(owner: owner, issue: .restricted)
        @unknown default:
            feedback = LocationFeedback(owner: owner, issue: .unavailable)
        }
    }

    func dismissFeedback(for owner: UUID, matching id: UUID? = nil) {
        if feedback?.owner == owner, id == nil || feedback?.id == id { feedback = nil }
    }

    private func requestPosition(for owner: UUID) {
        request = .position(owner)
        manager.requestLocation()
    }

    func authorizationChanged(to status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            // Authorization callbacks also arrive during initialization and
            // on reactivation. They must not restart an existing fix.
            if case .authorization(let owner) = request { requestPosition(for: owner) }
        case .denied, .restricted:
            coordinate = nil
            if case .position(let owner) = request {
                feedback = LocationFeedback(owner: owner, issue: status == .denied ? .denied : .restricted)
            }
            // Respect a denial in the system prompt without following it
            // immediately with another request or a settings reminder.
            request = .idle
        default: break
        }
    }

    func received(_ value: Coordinate?) {
        guard case .position(let owner) = request else { return }
        request = .idle
        if let value { coordinate = value; feedback = nil }
        else { feedback = LocationFeedback(owner: owner, issue: .unavailable) }
    }

    func failed(permissionDenied: Bool) {
        guard case .position(let owner) = request else { return }
        request = .idle
        let issue: LocationIssue
        if permissionDenied {
            switch manager.authorizationStatus {
            case .denied: coordinate = nil; issue = .denied
            case .restricted: coordinate = nil; issue = .restricted
            default: issue = .servicesUnavailable
            }
        } else { issue = .unavailable }
        feedback = LocationFeedback(owner: owner, issue: issue)
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor [weak self] in self?.authorizationChanged(to: status) }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let value = locations.last.map { Coordinate(lat: $0.coordinate.latitude, lng: $0.coordinate.longitude) }
        Task { @MainActor [weak self] in self?.received(value) }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let failure = error as NSError
        let permissionDenied = failure.domain == kCLErrorDomain && failure.code == CLError.denied.rawValue
        Task { @MainActor [weak self] in self?.failed(permissionDenied: permissionDenied) }
    }
}
