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
    var onVisibleVenueIDsChange: (@MainActor (Set<String>) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView()
        // Keep annotations and their shadows within the actual map surface.
        map.clipsToBounds = true
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
                let markerChanged = existing.update(result: result, sort: sort) || coordinator.lastCalmStyle != calmStyle
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
        coordinator.scheduleVisibleVenues(map)
    }

    static func dismantleUIView(_ map: MKMapView, coordinator: Coordinator) {
        coordinator.visibleReport?.cancel()
        map.delegate = nil
    }

    @MainActor final class Coordinator: NSObject, MKMapViewDelegate {
        var parent: VenueMapView
        var annotations: [String: VenueAnnotation] = [:]
        var lastSelection: String?
        var lastQuery = ""
        var lastLocation: Coordinate?
        var lastCalmStyle: Bool?
        var lastVisibleIDs: Set<String>?
        var visibleReport: Task<Void, Never>?
        var regionIsChanging = false
        init(_ parent: VenueMapView) { self.parent = parent }

        func mapView(_ mapView: MKMapView, regionWillChangeAnimated animated: Bool) {
            regionIsChanging = true
        }

        func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            regionIsChanging = false
            scheduleVisibleVenues(mapView)
        }

        func scheduleVisibleVenues(_ map: MKMapView) {
            guard parent.onVisibleVenueIDsChange != nil else { return }
            visibleReport?.cancel()
            // Defer publication out of updateUIView, and coalesce data/region
            // callbacks. No visible-region-per-frame callback is installed.
            visibleReport = Task { @MainActor [weak self, weak map] in
                guard !Task.isCancelled, let self, let map, !regionIsChanging, map.bounds.width > 0, map.bounds.height > 0 else { return }
                let rect = map.visibleMapRect
                let topLeft = MKMapPoint(x: rect.minX, y: rect.minY).coordinate
                let bottomRight = MKMapPoint(x: rect.maxX, y: rect.maxY).coordinate
                let bounds = VenueMapBounds(south: bottomRight.latitude, north: topLeft.latitude, west: topLeft.longitude, east: bottomRight.longitude)
                let ids = Set(annotations.compactMap { id, annotation in
                    bounds.contains(lat: annotation.coordinate.latitude, lng: annotation.coordinate.longitude) ? id : nil
                })
                guard ids != lastVisibleIDs else { return }
                lastVisibleIDs = ids
                parent.onVisibleVenueIDsChange?(ids)
            }
        }

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
                view.accessibilityIdentifier = "map-cluster"
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
                // A direct pin tap already supplies geographic context. Keep
                // its camera instead of treating it as a programmatic link.
                lastSelection = venue.result.id
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

    @discardableResult func update(result: VenueResult, sort: VenueSort) -> Bool {
        let appearanceChanged = self.result.beer != result.beer || self.sort != sort || self.result.venue.name != result.venue.name
        self.result = result
        self.sort = sort
        // Publish a coordinate change only when the accepted source moves.
        // MapKit retains this annotation and observes its KVO coordinate.
        if coordinate.latitude != result.venue.lat || coordinate.longitude != result.venue.lng {
            coordinate = CLLocationCoordinate2D(latitude: result.venue.lat, longitude: result.venue.lng)
        }
        return appearanceChanged
    }
}

@MainActor final class PriceAnnotationView: MKAnnotationView {
    private let label = UILabel()
    private let dot = UIView()
    private var calmStyle = false
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
        registerForTraitChanges([UITraitUserInterfaceStyle.self, UITraitAccessibilityContrast.self]) { (view: PriceAnnotationView, _) in
            view.updateAppearance()
        }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(_ annotation: VenueAnnotation, calmStyle: Bool = false) {
        self.calmStyle = calmStyle
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
        updateAppearance()
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)
        updateAppearance()
    }

    override func tintColorDidChange() {
        super.tintColorDidChange()
        updateAppearance()
    }

    private func updateAppearance() {
        backgroundColor = calmStyle ? .label : .systemBackground
        label.textColor = calmStyle ? .systemBackground : .label
        layer.borderWidth = calmStyle ? (isSelected ? 2 : 1) : 0
        let border: UIColor = isSelected ? tintColor : .systemBackground
        layer.borderColor = border.resolvedColor(with: traitCollection).cgColor
        layer.shadowOpacity = calmStyle ? 0.1 : 0.14
    }
}

@MainActor final class QuietClusterView: MKAnnotationView {
    private let label = UILabel()
    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        frame.size = CGSize(width: 34, height: 34)
        backgroundColor = .systemBackground
        layer.cornerRadius = 17
        layer.borderWidth = 1
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.06
        layer.shadowRadius = 3
        label.frame = bounds
        label.font = .monospacedDigitSystemFont(ofSize: 12, weight: .medium)
        label.textColor = .label
        label.textAlignment = .center
        addSubview(label)
        isAccessibilityElement = true
        accessibilityTraits = .button
        collisionMode = .circle
        displayPriority = .defaultHigh
        accessibilityIdentifier = "map-cluster"
        registerForTraitChanges([UITraitUserInterfaceStyle.self, UITraitAccessibilityContrast.self]) { (view: QuietClusterView, _) in
            view.updateBorder()
        }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(count: Int) {
        label.text = "\(count)"
        accessibilityLabel = "\(count) vietas. Pieskaries, lai tuvinātu."
        updateBorder()
    }

    private func updateBorder() {
        // CALayer colors do not automatically resolve again on appearance
        // changes like UIView's semantic background/label colors do.
        layer.borderColor = UIColor.separator.resolvedColor(with: traitCollection).cgColor
    }
}
