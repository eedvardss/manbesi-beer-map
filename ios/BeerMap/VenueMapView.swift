import MapKit
import SwiftUI

struct MapCluster: Identifiable {
    let ids: [String]
    var id: String { ids.sorted().joined(separator: ",") }
}

struct VenueMapView: UIViewRepresentable {
    let results: [VenueResult]
    let sort: VenueSort
    let query: String
    let location: Coordinate?
    @Binding var selectedID: String?
    var onCluster: ([String]) -> Void
    var calmStyle = false

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView()
        map.delegate = context.coordinator
        map.preferredConfiguration = MKStandardMapConfiguration(elevationStyle: .flat, emphasisStyle: .muted)
        map.pointOfInterestFilter = .excludingAll
        map.isRotateEnabled = false
        map.showsCompass = false
        map.register(PriceAnnotationView.self, forAnnotationViewWithReuseIdentifier: "price")
        map.register(MKMarkerAnnotationView.self, forAnnotationViewWithReuseIdentifier: "cluster")
        map.register(QuietClusterView.self, forAnnotationViewWithReuseIdentifier: "quiet-cluster")
        map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 56.9507, longitude: 24.116), span: MKCoordinateSpan(latitudeDelta: calmStyle ? 0.021 : 0.045, longitudeDelta: calmStyle ? 0.035 : 0.075)), animated: false)
        if calmStyle, results.count == 1, let result = results.first {
            map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: result.venue.lat, longitude: result.venue.lng), latitudinalMeters: 650, longitudinalMeters: 650), animated: false)
        }
        map.accessibilityIdentifier = "venue-map"
        return map
    }

    func updateUIView(_ map: MKMapView, context: Context) {
        let coordinator = context.coordinator
        coordinator.parent = self
        let visible = Set(results.map(\.id))
        for id in Array(coordinator.annotations.keys) where !visible.contains(id) {
            if let annotation = coordinator.annotations.removeValue(forKey: id) { map.removeAnnotation(annotation) }
        }
        for result in results {
            if let existing = coordinator.annotations[result.id] {
                let markerChanged = existing.result.beer != result.beer || existing.sort != sort || existing.result.venue.name != result.venue.name || coordinator.lastCalmStyle != calmStyle
                existing.result = result
                existing.sort = sort
                if markerChanged { (map.view(for: existing) as? PriceAnnotationView)?.configure(existing, calmStyle: calmStyle) }
            } else {
                let annotation = VenueAnnotation(result: result, sort: sort)
                coordinator.annotations[result.id] = annotation
                map.addAnnotation(annotation)
            }
        }
        coordinator.lastCalmStyle = calmStyle
        map.showsUserLocation = location != nil
        if location != coordinator.lastLocation, let location {
            coordinator.lastLocation = location
            map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: location.lat, longitude: location.lng), latitudinalMeters: 2400, longitudinalMeters: 2400), animated: true)
        }
        if selectedID != coordinator.lastSelection {
            coordinator.lastSelection = selectedID
            if let selectedID, let annotation = coordinator.annotations[selectedID] {
                map.setRegion(MKCoordinateRegion(center: annotation.coordinate, latitudinalMeters: 1000, longitudinalMeters: 1000), animated: true)
            } else {
                map.selectedAnnotations.forEach { map.deselectAnnotation($0, animated: false) }
            }
        }
        if query != coordinator.lastQuery {
            coordinator.lastQuery = query
            if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !coordinator.annotations.isEmpty {
                map.showAnnotations(Array(coordinator.annotations.values), animated: true)
            }
        }
    }

    @MainActor final class Coordinator: NSObject, MKMapViewDelegate {
        var parent: VenueMapView
        var annotations: [String: VenueAnnotation] = [:]
        var lastSelection: String?
        var lastQuery = ""
        var lastLocation: Coordinate?
        var lastCalmStyle: Bool?
        init(_ parent: VenueMapView) { self.parent = parent }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if let cluster = annotation as? MKClusterAnnotation {
                if parent.calmStyle {
                    let view = mapView.dequeueReusableAnnotationView(withIdentifier: "quiet-cluster", for: cluster) as! QuietClusterView
                    view.configure(count: cluster.memberAnnotations.count)
                    return view
                }
                let view = mapView.dequeueReusableAnnotationView(withIdentifier: "cluster", for: cluster) as! MKMarkerAnnotationView
                view.markerTintColor = UIColor.label
                view.glyphTintColor = UIColor.systemBackground
                view.glyphText = "\(cluster.memberAnnotations.count)"
                view.titleVisibility = .hidden
                view.subtitleVisibility = .hidden
                view.displayPriority = .defaultHigh
                view.accessibilityLabel = "\(cluster.memberAnnotations.count) vietas. Pieskaries, lai tuvinātu."
                return view
            }
            guard let venue = annotation as? VenueAnnotation else { return nil }
            let view = mapView.dequeueReusableAnnotationView(withIdentifier: "price", for: venue) as! PriceAnnotationView
            view.configure(venue, calmStyle: parent.calmStyle)
            return view
        }

        func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
            if let cluster = view.annotation as? MKClusterAnnotation {
                let members = cluster.memberAnnotations.compactMap { $0 as? VenueAnnotation }
                // Distinct bars may share an address. A list guarantees that
                // every member remains reachable even at the closest zoom.
                if mapView.region.span.latitudeDelta < 0.004 {
                    parent.onCluster(members.map { $0.result.id })
                } else { mapView.showAnnotations(members, animated: true) }
                mapView.deselectAnnotation(cluster, animated: false)
            } else if let venue = view.annotation as? VenueAnnotation {
                parent.selectedID = venue.result.id
            }
        }
    }
}

@MainActor final class VenueAnnotation: NSObject, @preconcurrency MKAnnotation {
    var result: VenueResult
    var sort: VenueSort
    @objc dynamic var coordinate: CLLocationCoordinate2D
    var title: String? { result.venue.name }
    init(result: VenueResult, sort: VenueSort) {
        self.result = result
        self.sort = sort
        coordinate = CLLocationCoordinate2D(latitude: result.venue.lat, longitude: result.venue.lng)
        super.init()
    }
}

@MainActor final class PriceAnnotationView: MKAnnotationView {
    private let label = UILabel()
    private let dot = UIView()
    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        clusteringIdentifier = "venue"
        collisionMode = .rectangle
        displayPriority = .defaultHigh
        backgroundColor = .systemBackground
        layer.cornerRadius = 15
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.14
        layer.shadowRadius = 5
        layer.shadowOffset = CGSize(width: 0, height: 2)
        label.font = .monospacedDigitSystemFont(ofSize: 12, weight: .semibold)
        label.textColor = .label
        addSubview(label)
        dot.layer.cornerRadius = 3
        addSubview(dot)
        isAccessibilityElement = true
        accessibilityTraits = .button
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(_ annotation: VenueAnnotation, calmStyle: Bool = false) {
        let beer = annotation.result.beer
        let amount = annotation.sort == .litre ? beer.perLitre : beer.price
        label.text = amount.map { (beer.priceIsFrom == true ? "no " : "") + $0.euros + (annotation.sort == .litre ? "/l" : "") } ?? "— €/l"
        label.sizeToFit()
        frame.size = CGSize(width: label.bounds.width + (calmStyle ? 20 : 27), height: 30)
        label.frame.origin = CGPoint(x: calmStyle ? 10 : 18, y: (30 - label.bounds.height) / 2)
        dot.isHidden = calmStyle
        dot.frame = CGRect(x: 8, y: 12, width: 6, height: 6)
        let comparable = amount.map { annotation.sort == .litre ? $0 / 2 : $0 }
        dot.backgroundColor = comparable.map { $0 < 4 ? .systemGreen : $0 <= 6 ? .systemOrange : .systemRed } ?? .systemGray
        accessibilityLabel = "\(annotation.result.venue.name), \(label.text!), \(beer.volumeLabel)"
        accessibilityIdentifier = "pin-\(annotation.result.id)"
        centerOffset = CGPoint(x: 0, y: -15)
    }
}

@MainActor final class QuietClusterView: MKAnnotationView {
    private let label = UILabel()
    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        frame.size = CGSize(width: 34, height: 34)
        backgroundColor = .label
        layer.cornerRadius = 17
        layer.borderWidth = 2
        layer.borderColor = UIColor.systemBackground.cgColor
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 3
        label.frame = bounds
        label.font = .monospacedDigitSystemFont(ofSize: 12, weight: .semibold)
        label.textColor = .systemBackground
        label.textAlignment = .center
        addSubview(label)
        isAccessibilityElement = true
        accessibilityTraits = .button
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(count: Int) {
        label.text = "\(count)"
        accessibilityLabel = "\(count) vietas. Pieskaries, lai tuvinātu."
    }
}
