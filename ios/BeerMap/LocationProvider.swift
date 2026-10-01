@preconcurrency import CoreLocation
import Observation

@MainActor @Observable
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    private(set) var coordinate: Coordinate?
    private(set) var isLocating = false
    private(set) var message: String?
    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func locate() {
        message = nil
        switch manager.authorizationStatus {
        case .notDetermined:
            isLocating = true
            manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            isLocating = true
            manager.requestLocation()
        case .denied, .restricted:
            isLocating = false
            message = "Lai atrastu tuvākās vietas, atļauj atrašanās vietu lietotnes iestatījumos."
        @unknown default: isLocating = false
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor [weak self] in
            guard let self else { return }
            if (status == .authorizedWhenInUse || status == .authorizedAlways) && isLocating { self.manager.requestLocation() }
            else if status == .denied || status == .restricted { isLocating = false; message = "Atrašanās vieta nav pieejama. Karti vari izmantot arī bez tās." }
        }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let value = locations.last.map { Coordinate(lat: $0.coordinate.latitude, lng: $0.coordinate.longitude) }
        Task { @MainActor [weak self] in self?.coordinate = value; self?.isLocating = false }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor [weak self] in self?.isLocating = false; self?.message = "Atrašanās vietu neizdevās noteikt. Mēģini vēlreiz." }
    }
}
