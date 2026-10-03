import SwiftUI
import Combine

private struct SelectedVenue: Identifiable { let id: String }

struct RootView: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(LocationProvider.self) private var location
    @State private var tab = 0
    private let clock = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        TabView(selection: $tab) {
            Tab("Karte", systemImage: "map", value: 0) { NavigationStack { MapScreen() } }
            Tab("Vietas", systemImage: "list.bullet", value: 1) { NavigationStack { PlacesScreen(savedOnly: false) } }
            Tab("Saglabāts", systemImage: "bookmark", value: 2) { NavigationStack { PlacesScreen(savedOnly: true) } }
        }
        .sheet(item: Binding(get: { store.selectedID.map { SelectedVenue(id: $0) } }, set: { store.selectedID = $0?.id })) { selection in
            if let result = store.result(id: selection.id, location: location.coordinate) {
                NavigationStack { VenueDetailView(result: result, hasCloseButton: true) }
                    .presentationDetents([.height(350), .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackgroundInteraction(.enabled(upThrough: .height(350)))
            }
        }
        .onChange(of: location.coordinate) { _, coordinate in
            if coordinate != nil { store.filter.sort = .distance }
        }
        .onReceive(clock) { store.now = $0 }
    }
}

struct MapScreen: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(LocationProvider.self) private var location
    @State private var cluster: MapCluster?
    var body: some View {
        @Bindable var store = store
        let results = store.results(location: location.coordinate)
        VStack(spacing: 0) {
            VenueMapView(results: results, sort: store.filter.sort, query: store.filter.query, location: location.coordinate, selectedID: $store.selectedID) { cluster = MapCluster(ids: $0) }
                .overlay {
                    if results.isEmpty { EmptyResultsView(savedOnly: false).padding(24).background(.regularMaterial, in: .rect(cornerRadius: 24)).padding(24) }
                }
            // Reserve a separate row so status and controls cannot cover
            // MapKit's own attribution, even when text wraps.
            MapOverviewStatus(count: results.count, offline: store.usesOfflineCatalog, message: location.message)
        }
            .safeAreaInset(edge: .top, spacing: 0) {
                QuickFilters().padding(.horizontal, 16).padding(.vertical, 10)
            }
            .navigationTitle("Rīgas alus")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $store.filter.query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Vieta, alus vai iela")
            .searchPresentationToolbarBehavior(.avoidHidingContent)
            .toolbar { MapToolbar() }
            .sheet(item: $cluster) { cluster in
                NavigationStack {
                    List(results.filter { cluster.ids.contains($0.id) }) { result in
                        NavigationLink { VenueDetailView(result: result, hasCloseButton: false) } label: { VenueRow(result: result) }
                    }
                    .navigationTitle("Vietas tuvumā")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Gatavs") { self.cluster = nil } } }
                }
                .presentationDetents([.medium, .large])
            }
    }
}

private struct MapOverviewStatus: View {
    let count: Int
    let offline: Bool
    let message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let message {
                Text(message).font(.caption).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(count) \(count == 1 ? "vieta" : "vietas")")
                        .font(.subheadline.weight(.semibold))
                    Text(offline ? "Saglabātā karte" : "Rīga · cenas ar avotiem")
                        .font(.caption).foregroundStyle(.secondary)
                }
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                LocateButton()
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
        .background(.background, ignoresSafeAreaEdges: [])
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("map-overview-status")
    }
}

struct QuickFilters: View {
    @Environment(BeerMapStore.self) private var store
    var body: some View {
        GlassEffectContainer(spacing: 8) {
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    FilterChip("Zem 5 €", active: store.filter.priceBand == .under5) { store.filter.priceBand = store.filter.priceBand == .under5 ? .all : .under5 }
                    FilterChip("500 ml", active: store.filter.size == .halfLitre) { store.filter.size = store.filter.size == .halfLitre ? .any : .halfLitre }
                    FilterChip("Atvērts", active: store.filter.openOnly) { store.filter.openOnly.toggle() }
                }
            }
            .scrollIndicators(.hidden)
            .scrollClipDisabled()
            .fixedSize(horizontal: false, vertical: true)
            .frame(minHeight: 44)
        }
    }
}

private struct FilterChip: View {
    let title: String
    let active: Bool
    let action: () -> Void
    init(_ title: String, active: Bool, action: @escaping () -> Void) { self.title = title; self.active = active; self.action = action }
    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if active { Image(systemName: "checkmark").font(.caption.weight(.semibold)) }
                Text(title).font(.subheadline.weight(.medium))
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .glassEffect(active ? .regular.tint(Theme.accent.opacity(0.2)).interactive() : .regular.interactive(), in: .capsule)
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}

struct LocateButton: View {
    @Environment(LocationProvider.self) private var location
    var body: some View {
        Button { location.locate() } label: {
            Group {
                if location.isLocating { ProgressView() }
                else { Image(systemName: "location").font(.title3.weight(.medium)) }
            }
            .frame(width: 48, height: 48)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .accessibilityLabel("Mana atrašanās vieta")
        .accessibilityIdentifier("locate")
    }
}

struct MapToolbar: ToolbarContent {
    @Environment(BeerMapStore.self) private var store
    @State private var showFilters = false
    @State private var showAbout = false
    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button("Par karti", systemImage: "info.circle") { showAbout = true }
                .sheet(isPresented: $showAbout) { NavigationStack { AboutView() } }
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button("Filtri", systemImage: store.filter.hasFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease") { showFilters = true }
                .accessibilityIdentifier("filters")
                .sheet(isPresented: $showFilters) { NavigationStack { FiltersView() } }
        }
    }
}

struct PlacesScreen: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(LocationProvider.self) private var location
    let savedOnly: Bool

    var body: some View {
        @Bindable var store = store
        let results = store.results(location: location.coordinate, savedOnly: savedOnly)
        List {
            if !results.isEmpty {
                Section {
                    ForEach(results) { result in
                        HStack(spacing: 12) {
                            Button { store.selectedID = result.id } label: { VenueRow(result: result) }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("venue-\(result.id)")
                            SaveButton(venueID: result.id, name: result.venue.name)
                        }
                        .listRowInsets(EdgeInsets(top: 14, leading: 20, bottom: 14, trailing: 16))
                    }
                } header: {
                    HStack {
                        Text("\(results.count) \(results.count == 1 ? "vieta" : "vietas")")
                        Spacer()
                        Text(store.filter.sort.label)
                    }.textCase(nil)
                } footer: {
                    Text("Cenas pārbaudītas \(store.checkedLabel). Attālumi ir taisnā līnijā. Aktuālo cenu pārbaudi vietas avotā.").font(.caption)
                }
            }
        }
        .listStyle(.plain)
        .overlay {
            if results.isEmpty { EmptyResultsView(savedOnly: savedOnly).padding(24) }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            VStack(spacing: 8) {
                QuickFilters()
                if let message = location.message { Text(message).font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
                if store.usesOfflineCatalog { Label("Saglabātā karte · \(store.checkedLabel)", systemImage: "arrow.down.circle").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }.padding(.horizontal, 20).padding(.bottom, 8)
        }
        .navigationTitle(savedOnly ? "Saglabāts" : "Vietas")
        .searchable(text: $store.filter.query, prompt: "Vieta, alus vai iela")
        .searchPresentationToolbarBehavior(.avoidHidingContent)
        .toolbar { MapToolbar() }
        .refreshable { await store.refresh() }
    }
}

struct VenueRow: View {
    @Environment(BeerMapStore.self) private var store
    let result: VenueResult
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text(result.venue.name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                Text(result.beer.name).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                HStack(spacing: 6) {
                    Text(result.beer.volumeLabel)
                    if let distance = result.distanceMetres { Text("·"); Text(distance.distanceLabel) }
                }.font(.caption2).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .trailing, spacing: 5) {
                Text(store.filter.sort == .litre ? result.beer.litreLabel : result.beer.priceLabel)
                    .font(.subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(.primary)
                if store.filter.sort == .litre { Text(result.beer.priceLabel + " par porciju").font(.caption2).foregroundStyle(.secondary) }
                else if result.beer.perLitre != nil { Text(result.beer.litreLabel).font(.caption2).foregroundStyle(.secondary) }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .contentShape(Rectangle())
    }
}

struct SaveButton: View {
    @Environment(BeerMapStore.self) private var store
    let venueID: String
    let name: String
    var body: some View {
        let saved = store.savedIDs.contains(venueID)
        Button { store.toggleSaved(venueID) } label: {
            Image(systemName: saved ? "bookmark.fill" : "bookmark")
                .font(.body).frame(width: 32, height: 44)
                .foregroundStyle(saved ? Theme.accent : Color.secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(saved ? "Noņemt no saglabātā: \(name)" : "Saglabāt: \(name)")
        .accessibilityIdentifier("save-\(venueID)")
        .sensoryFeedback(.selection, trigger: saved)
    }
}

struct EmptyResultsView: View {
    @Environment(BeerMapStore.self) private var store
    let savedOnly: Bool
    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: savedOnly && store.savedIDs.isEmpty ? "bookmark" : "magnifyingglass").font(.system(size: 36, weight: .light)).foregroundStyle(.secondary)
            Text(savedOnly && store.savedIDs.isEmpty ? "Tavas vietas, vienuviet" : "Nekas neatradās").font(.title3.weight(.semibold))
            Text(savedOnly && store.savedIDs.isEmpty ? "Pieskaries grāmatzīmei pie vietas, lai to atrastu šeit arī bez interneta." : "Pamēģini citu meklējumu vai noņem kādu filtru.")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            if !(savedOnly && store.savedIDs.isEmpty) { Button("Notīrīt filtrus") { store.resetFilters() }.buttonStyle(.glass) }
        }
    }
}
