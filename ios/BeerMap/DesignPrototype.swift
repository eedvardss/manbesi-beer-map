#if DEBUG
// Throwaway native design study: three structural directions on the app's existing root.
// Launch with --design-study --design=A, or manbesi://design?variant=B while running.
// Real read-only catalog; bookmarks and filters are in memory. No network/cache writes.
import SwiftUI
import MapKit

private enum DesignVariant: String, CaseIterable {
    case map = "A", guide = "B", comparison = "C"
    var name: String {
        switch self { case .map: "Karte"; case .guide: "Pilsētas gids"; case .comparison: "Salīdzinājums" }
    }
    func next(_ offset: Int) -> Self {
        let variants = Self.allCases
        let index = variants.firstIndex(of: self)!
        return variants[(index + offset + variants.count) % variants.count]
    }
}

private enum StudyPalette {
    static let ink = Color(.label)
    static let paper = Color(.systemBackground)
    static let canvas = Color(.secondarySystemBackground)
    static let accent = Color(red: 0.63, green: 0.29, blue: 0.13)
    static let olive = Color(red: 0.25, green: 0.35, blue: 0.24)
}

private struct StudySelection: Identifiable {
    let result: VenueResult
    var id: String { result.id }
}

struct DesignPrototypeRoot: View {
    @State private var store: BeerMapStore = {
        let store = BeerMapStore(ephemeral: true)
        store.filter.size = .halfLitre
        return store
    }()
    @State private var location = LocationProvider()
    @State private var variant: DesignVariant = {
        let argument = ProcessInfo.processInfo.arguments.first { $0.hasPrefix("--design=") }
        return DesignVariant(rawValue: argument?.replacingOccurrences(of: "--design=", with: "") ?? "A") ?? .map
    }()
    @State private var selection: StudySelection?
    @State private var selectedMapID: String?
    @State private var showFilters = false
    @State private var appearance: ColorScheme?
    @State private var textSize: DynamicTypeSize = .large
    @FocusState private var editingSearch: Bool

    var body: some View {
        Group {
            switch variant {
            case .map:
                MapDesignPrototype(store: store, editingSearch: $editingSearch, showFilters: $showFilters, selectedID: $selectedMapID, select: select)
            case .guide:
                GuideDesignPrototype(store: store, editingSearch: $editingSearch, showFilters: $showFilters, select: select)
            case .comparison:
                ComparisonDesignPrototype(store: store, editingSearch: $editingSearch, showFilters: $showFilters, select: select, showMap: { variant = .map })
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { switcher }
        .sheet(item: $selection, onDismiss: { selectedMapID = nil }) { selected in
            NavigationStack { StudyVenueDetail(result: selected.result) }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showFilters) { NavigationStack { FiltersView() } }
        .environment(store)
        .environment(location)
        .tint(StudyPalette.accent)
        .preferredColorScheme(appearance)
        .dynamicTypeSize(textSize)
        .onOpenURL { url in
            guard url.scheme == "manbesi", url.host == "design",
                  let key = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "variant" })?.value,
                  let design = DesignVariant(rawValue: key) else { return }
            variant = design
        }
        .onKeyPress(.leftArrow) { cycle(-1) }
        .onKeyPress(.rightArrow) { cycle(1) }
    }

    private func select(_ result: VenueResult) {
        editingSearch = false
        selection = StudySelection(result: result)
    }

    private func cycle(_ offset: Int) -> KeyPress.Result {
        guard !editingSearch else { return .ignored }
        variant = variant.next(offset)
        return .handled
    }

    private var switcher: some View {
        HStack(spacing: 0) {
            Button { variant = variant.next(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }
                .accessibilityLabel("Iepriekšējais dizains").accessibilityIdentifier("design-previous")
            VStack(spacing: 2) {
                Text("DIZAINA SKICE").font(.system(size: 8, weight: .semibold)).tracking(1.8).foregroundStyle(.white.opacity(0.55))
                Text("\(variant.rawValue) · \(variant.name)").font(.system(size: 12, weight: .medium))
            }.frame(minWidth: 134)
            Button { variant = variant.next(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }
                .accessibilityLabel("Nākamais dizains").accessibilityIdentifier("design-next")
            Menu {
                Button("Sistēmas izskats") { appearance = nil }
                Button("Gaišs izskats") { appearance = .light }
                Button("Tumšs izskats") { appearance = .dark }
                Divider()
                Button("Parasts teksts") { textSize = .large }
                Button("Liels teksts") { textSize = .accessibility1 }
            } label: { Image(systemName: "slider.horizontal.3").frame(width: 36, height: 44) }
                .accessibilityLabel("Skices izskats un teksta izmērs")
        }
        .buttonStyle(.plain).foregroundStyle(.white)
        .padding(.horizontal, 4)
        .background(Color(white: 0.1), in: .capsule)
        .padding(.top, 8).padding(.bottom, 5)
        .frame(maxWidth: .infinity)
        .background(StudyPalette.paper)
        .dynamicTypeSize(.large)
    }
}

// A: the map is the primary content; a compact search floats over it and a useful
// place list anchors the bottom. No separate title bar or persistent warnings.
private struct MapDesignPrototype: View {
    @Environment(\.dynamicTypeSize) private var textSize
    @Bindable var store: BeerMapStore
    var editingSearch: FocusState<Bool>.Binding
    @Binding var showFilters: Bool
    @Binding var selectedID: String?
    let select: (VenueResult) -> Void
    @State private var showingAll = false
    @State private var savedOnly = false
    @State private var clusterIDs: [String]?

    private var results: [VenueResult] {
        let values = store.results(location: nil, savedOnly: savedOnly)
        guard let clusterIDs else { return values }
        return values.filter { clusterIDs.contains($0.id) }
    }

    var body: some View {
        ZStack(alignment: .top) {
            VenueMapView(results: store.results(location: nil, savedOnly: savedOnly), sort: store.filter.sort, query: store.filter.query, location: nil, selectedID: $selectedID, onCluster: { clusterIDs = $0; showingAll = true }, calmStyle: true)
            StudySearchField(query: $store.filter.query, focus: editingSearch, filterActive: store.filter.hasFilters, showFilters: { showFilters = true }, floating: true)
                .padding(.horizontal, 20).padding(.top, 9)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(savedOnly ? "Tavas vietas" : "Rīgas alus").font(.title3.weight(.semibold))
                        Text("\(results.count) vietas · \(store.filter.size == .halfLitre ? "500 ml" : store.filter.sort.label.lowercased())").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                    Button { savedOnly.toggle() } label: { Image(systemName: savedOnly ? "bookmark.fill" : "bookmark").frame(width: 44, height: 44) }
                        .buttonStyle(.plain).foregroundStyle(savedOnly ? StudyPalette.accent : .primary)
                        .accessibilityLabel(savedOnly ? "Rādīt visas vietas" : "Rādīt saglabātās vietas")
                    Button { showingAll.toggle(); clusterIDs = nil } label: { Image(systemName: showingAll ? "chevron.down" : "list.bullet").frame(width: 44, height: 44) }
                        .buttonStyle(.plain).accessibilityLabel(showingAll ? "Sakļaut vietas" : "Visas vietas")
                }.padding(.horizontal, 20).padding(.top, 18).padding(.bottom, 8)
                ScrollView {
                    LazyVStack(spacing: 0) {
                        if results.isEmpty { StudyEmptyState(savedOnly: savedOnly).padding(20) }
                        ForEach(showingAll ? results : Array(results.prefix(2))) { result in
                            StudyPlaceRow(result: result, store: store, select: select)
                                .padding(.horizontal, 20).padding(.vertical, 12)
                        }
                    }
                }
                .frame(maxHeight: showingAll ? 360 : (textSize.isAccessibilitySize ? 260 : 184))
                .scrollIndicators(.hidden)
                .scrollDismissesKeyboard(.interactively)
            }
            .background(StudyPalette.paper, in: .rect(topLeadingRadius: 26, topTrailingRadius: 26))
        }
        .onChange(of: selectedID) { _, id in
            if let id, let result = store.result(id: id, location: nil) { select(result) }
        }
        .onChange(of: store.filter.query) { _, _ in clusterIDs = nil }
    }
}

// B: an editorial city guide. Typography and a real price/serving lead;
// geographic context is a quiet inset, not the main screen.
private struct GuideDesignPrototype: View {
    @Bindable var store: BeerMapStore
    var editingSearch: FocusState<Bool>.Binding
    @Binding var showFilters: Bool
    let select: (VenueResult) -> Void
    @ScaledMetric(relativeTo: .largeTitle) private var titleSize = 42.0
    @State private var savedOnly = false
    @State private var miniMapSelection: String?

    private var results: [VenueResult] { store.results(location: nil, savedOnly: savedOnly) }
    private var halfLitre: VenueResult? {
        var filter = VenueFilter()
        filter.size = .halfLitre
        return VenueQuery.run(store.venues, filter: filter).first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    Text("RĪGA / ALUS").font(.caption.weight(.semibold)).tracking(3)
                    Spacer()
                    Button { savedOnly.toggle() } label: {
                        Label(savedOnly ? "Visas vietas" : "Saglabāts", systemImage: savedOnly ? "square.grid.2x2" : "bookmark")
                            .font(.subheadline)
                    }.buttonStyle(.plain)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text(savedOnly ? "Tavas vietas." : "Vieta vakaram.")
                        .font(.system(size: titleSize, weight: .regular, design: .serif)).tracking(-1.5)
                    Text("Atrodi alu par labu cenu.").font(.subheadline).foregroundStyle(.secondary)
                }
                StudySearchField(query: $store.filter.query, focus: editingSearch, filterActive: store.filter.hasFilters, showFilters: { showFilters = true }, floating: false)
                if store.filter.query.isEmpty && !savedOnly, let halfLitre {
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("500 ML RĪGĀ").font(.system(.caption2, weight: .medium)).tracking(1.2).foregroundStyle(.secondary)
                            Text("no " + halfLitre.beer.price.euros).font(.system(.title, design: .serif)).tracking(-0.8)
                            Button { select(halfLitre) } label: {
                                HStack(spacing: 5) { Text(halfLitre.venue.name).lineLimit(2); Image(systemName: "arrow.up.right").font(.caption2) }
                                    .font(.caption.weight(.medium)).foregroundStyle(StudyPalette.olive)
                            }.buttonStyle(.plain)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        VenueMapView(results: [halfLitre], sort: .price, query: "", location: nil, selectedID: $miniMapSelection, onCluster: { _ in }, calmStyle: true)
                            .frame(width: 136, height: 142).clipShape(.rect(cornerRadius: 12))
                            .allowsHitTesting(false)
                    }.padding(.vertical, 7)
                }
                HStack(alignment: .firstTextBaseline) {
                    Text(savedOnly ? "Saglabātās vietas" : "Atklāj pilsētu").font(.title3.weight(.medium))
                    Spacer()
                    Text("\(results.count) vietas").font(.caption).foregroundStyle(.secondary)
                }
                LazyVStack(spacing: 0) {
                    if results.isEmpty { StudyEmptyState(savedOnly: savedOnly).padding(.vertical, 24) }
                    ForEach(results) { result in
                        GuidePlaceRow(result: result, store: store, select: select).padding(.vertical, 14)
                    }
                }
                Text("Cenas pārbaudītas \(store.checkedLabel). Avoti pie katras vietas.").font(.caption).foregroundStyle(.secondary)
            }.padding(.horizontal, 24).padding(.top, 15).padding(.bottom, 24)
        }
        .background(StudyPalette.paper)
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }
}

// C: direct price comparison. A flat, aligned price column is the primary
// affordance. The map becomes a secondary, explicit mode switch.
private struct ComparisonDesignPrototype: View {
    @Bindable var store: BeerMapStore
    var editingSearch: FocusState<Bool>.Binding
    @Binding var showFilters: Bool
    let select: (VenueResult) -> Void
    let showMap: () -> Void
    @State private var savedOnly = false

    private var results: [VenueResult] { store.results(location: nil, savedOnly: savedOnly) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Rīgas alus").font(.subheadline.weight(.semibold))
                Spacer()
                Button { savedOnly.toggle() } label: { Image(systemName: savedOnly ? "bookmark.fill" : "bookmark").frame(width: 44, height: 44) }
                    .buttonStyle(.plain).accessibilityLabel("Saglabātās vietas")
            }.padding(.horizontal, 22)
            Text(savedOnly ? "Saglabāts." : "Salīdzini.").font(.largeTitle.weight(.semibold)).tracking(-1.2)
                .padding(.horizontal, 22).padding(.top, 3).padding(.bottom, 20)
            StudySearchField(query: $store.filter.query, focus: editingSearch, filterActive: store.filter.hasFilters, showFilters: { showFilters = true }, floating: false)
                .padding(.horizontal, 22)
            HStack(spacing: 24) {
                comparisonTab("Par porciju", sort: .price)
                comparisonTab("Par litru", sort: .litre)
                Spacer(minLength: 0)
                Button { store.filter.size = store.filter.size == .halfLitre ? .any : .halfLitre } label: {
                    Text("500 ml").font(.subheadline).foregroundStyle(store.filter.size == .halfLitre ? .primary : .secondary)
                }.buttonStyle(.plain).frame(minHeight: 44).accessibilityAddTraits(store.filter.size == .halfLitre ? .isSelected : [])
            }.padding(.horizontal, 22).padding(.top, 15)
            HStack {
                Text("VIETA / PORCIJA")
                Spacer()
                Text(store.filter.sort == .litre ? "EUR / L" : "EUR")
            }.font(.system(size: 10, weight: .medium)).tracking(1.3).foregroundStyle(.secondary)
                .padding(.horizontal, 22).padding(.top, 18).padding(.bottom, 8)
            ScrollView {
                LazyVStack(spacing: 0) {
                    if results.isEmpty { StudyEmptyState(savedOnly: savedOnly).padding(24) }
                    ForEach(results) { result in
                        Button { select(result) } label: {
                            HStack(alignment: .firstTextBaseline, spacing: 16) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(result.venue.name).font(.body.weight(.medium)).foregroundStyle(.primary)
                                    Text(result.beer.name).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                    Text(result.beer.volumeLabel).font(.caption).foregroundStyle(.secondary)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                VStack(alignment: .trailing, spacing: 6) {
                                    Text(comparisonPrice(result.beer)).font(.title2.weight(.medium)).monospacedDigit().tracking(-0.6).foregroundStyle(.primary)
                                    if store.filter.sort == .litre { Text(result.beer.priceLabel + " / porcija").font(.caption2).foregroundStyle(.secondary) }
                                }
                            }.contentShape(Rectangle()).padding(.vertical, 19)
                        }.buttonStyle(.plain).padding(.horizontal, 22)
                        Rectangle().fill(Color.primary.opacity(0.07)).frame(height: 0.5).padding(.horizontal, 22)
                    }
                }
            }.scrollIndicators(.hidden).scrollDismissesKeyboard(.interactively)
            Button(action: showMap) {
                HStack { Label("Skatīt karti", systemImage: "map"); Spacer(); Text("\(results.count) vietas").foregroundStyle(.secondary); Image(systemName: "arrow.up.right").font(.caption) }
                    .font(.subheadline.weight(.medium)).padding(.horizontal, 22).padding(.vertical, 16)
                    .contentShape(Rectangle())
            }.buttonStyle(.plain).background(StudyPalette.canvas)
        }
        .background(StudyPalette.paper)
    }

    private func comparisonPrice(_ beer: Serving) -> String {
        let price = store.filter.sort == .litre ? beer.perLitre : beer.price
        return price.map { (beer.priceIsFrom == true ? "no " : "") + $0.euros.replacingOccurrences(of: "€", with: "").trimmingCharacters(in: .whitespaces) } ?? "—"
    }

    private func comparisonTab(_ title: String, sort: VenueSort) -> some View {
        Button { store.filter.sort = sort } label: {
            VStack(spacing: 11) {
                Text(title).font(.subheadline.weight(store.filter.sort == sort ? .semibold : .regular))
                    .foregroundStyle(store.filter.sort == sort ? .primary : .secondary)
                Rectangle().fill(store.filter.sort == sort ? Color.primary : .clear).frame(height: 2)
            }.padding(.top, 12)
        }.buttonStyle(.plain).accessibilityAddTraits(store.filter.sort == sort ? .isSelected : [])
    }
}

private struct StudySearchField: View {
    @Binding var query: String
    var focus: FocusState<Bool>.Binding
    let filterActive: Bool
    let showFilters: () -> Void
    let floating: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass").font(.body).foregroundStyle(.secondary)
            TextField("Vieta, alus vai iela", text: $query)
                .font(.subheadline).focused(focus).submitLabel(.search).autocorrectionDisabled()
                .onSubmit { focus.wrappedValue = false }
                .accessibilityIdentifier("study-search")
            if !query.isEmpty {
                Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary).frame(width: 32, height: 44) }
                    .buttonStyle(.plain).accessibilityLabel("Notīrīt meklējumu").accessibilityIdentifier("study-clear-search")
            }
            Button(action: showFilters) {
                Image(systemName: filterActive ? "line.3.horizontal.decrease.circle.fill" : "slider.horizontal.3")
                    .font(.body).frame(width: 36, height: 44)
            }.buttonStyle(.plain).foregroundStyle(.primary).accessibilityLabel("Filtri").accessibilityIdentifier("study-filters")
        }
        .padding(.leading, 16).padding(.trailing, 7).frame(minHeight: 52)
        .background(floating ? StudyPalette.paper : StudyPalette.canvas, in: .rect(cornerRadius: floating ? 20 : 12))
        .shadow(color: .black.opacity(floating ? 0.08 : 0), radius: 12, y: 4)
    }
}

private struct StudyPlaceRow: View {
    let result: VenueResult
    let store: BeerMapStore
    let select: (VenueResult) -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button { select(result) } label: {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(result.venue.name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                        Text(result.venue.address).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        Text(result.beer.name + " · " + result.beer.volumeLabel).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                    Text(store.filter.sort == .litre ? result.beer.litreLabel : result.beer.priceLabel)
                        .font(.body.weight(.semibold)).monospacedDigit().foregroundStyle(.primary)
                }.contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityIdentifier("study-venue-\(result.id)")
            SaveButton(venueID: result.id, name: result.venue.name)
        }
    }
}

private struct GuidePlaceRow: View {
    let result: VenueResult
    let store: BeerMapStore
    let select: (VenueResult) -> Void
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button { select(result) } label: {
                VStack(alignment: .leading, spacing: 6) {
                    Text(result.venue.name).font(.system(.title3, design: .serif)).foregroundStyle(.primary)
                    Text(result.venue.address).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    Text(result.beer.name + " · " + result.beer.volumeLabel).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
            }.buttonStyle(.plain)
            VStack(alignment: .trailing, spacing: 3) {
                Text(store.filter.sort == .litre ? result.beer.litreLabel : result.beer.priceLabel).font(.subheadline.weight(.medium)).monospacedDigit()
                SaveButton(venueID: result.id, name: result.venue.name)
            }
        }
    }
}

private struct StudyEmptyState: View {
    @Environment(BeerMapStore.self) private var store
    let savedOnly: Bool
    private var noBookmarks: Bool { savedOnly && store.savedIDs.isEmpty }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(noBookmarks ? "Tavas vietas sākas šeit." : "Nekas neatradās.").font(.headline)
            Text(noBookmarks ? "Saglabā vietu ar grāmatzīmi. Tā būs vienmēr pa rokai." : "Pamēģini citu nosaukumu vai mazāk filtru.")
                .font(.subheadline).foregroundStyle(.secondary)
            if !noBookmarks {
                Button("Notīrīt filtrus") { store.resetFilters() }
                    .font(.subheadline.weight(.medium)).buttonStyle(.plain).frame(minHeight: 44)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

// Shared detail is content, not glass. Clear address and real serving first,
// one dominant directions action, complete menu and provenance below.
private struct StudyVenueDetail: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let result: VenueResult
    @State private var showSources = false
    @State private var mapSelection: String?
    @ScaledMetric(relativeTo: .title) private var titleSize = 30.0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(result.venue.kind.uppercased()).font(.caption2.weight(.medium)).tracking(1.3).foregroundStyle(.secondary)
                    Text(result.venue.name).font(.system(size: titleSize, weight: .semibold)).tracking(-0.8).accessibilityIdentifier("study-detail-name")
                    Text(result.venue.address).font(.subheadline).foregroundStyle(.secondary).textSelection(.enabled)
                }
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(result.beer.priceLabel).font(.largeTitle.weight(.semibold)).tracking(-1).monospacedDigit()
                    Text(result.beer.volumeLabel).font(.subheadline).foregroundStyle(.secondary)
                    Spacer(minLength: 0)
                    if result.beer.perLitre != nil { Text(result.beer.litreLabel).font(.caption).foregroundStyle(.secondary) }
                }
                Text(result.beer.name).font(.subheadline).foregroundStyle(.secondary).padding(.top, -15)
                HStack(spacing: 14) {
                    Link(destination: result.venue.directionsURL) {
                        HStack { Image(systemName: "figure.walk"); Text("Doties uz vietu"); Spacer(); Image(systemName: "arrow.up.right").font(.caption) }
                            .font(.subheadline.weight(.semibold)).foregroundStyle(StudyPalette.paper)
                            .padding(16).background(Color.primary, in: .rect(cornerRadius: 14))
                    }.accessibilityIdentifier("study-directions")
                    ShareLink(item: result.venue.shareURL) { Image(systemName: "square.and.arrow.up").font(.body).frame(width: 44, height: 48) }
                        .foregroundStyle(.primary).accessibilityLabel("Dalīties ar vietu")
                }
                VenueMapView(results: [result], sort: .price, query: "", location: nil, selectedID: $mapSelection, onCluster: { _ in }, calmStyle: true)
                    .frame(height: 150).clipShape(.rect(cornerRadius: 14)).allowsHitTesting(false)
                HStack(alignment: .firstTextBaseline) {
                    Text("Aluskarte").font(.title3.weight(.semibold))
                    Spacer()
                    Text("\(result.venue.beers.count) izvēles").font(.caption).foregroundStyle(.secondary)
                }
                LazyVStack(spacing: 18) {
                    ForEach(Array(result.venue.beers.sorted { VenueQuery.precedes($0, $1, sort: store.filter.sort) }.enumerated()), id: \.offset) { _, beer in
                        HStack(alignment: .firstTextBaseline, spacing: 16) {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(beer.name).font(.subheadline)
                                Text(beer.volumeLabel).font(.caption).foregroundStyle(.secondary)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                            Text(beer.priceLabel).font(.subheadline.weight(.medium)).monospacedDigit()
                        }
                    }
                }
                DisclosureGroup("Avots · \(store.checkedLabel)", isExpanded: $showSources) {
                    VStack(alignment: .leading, spacing: 12) {
                        Link(result.venue.sourceLabel, destination: URL(string: result.venue.sourceUrl)!)
                        Text("Cenas var būt mainījušās. Aktuālo cenu pārbaudi vietas avotā. Lejupielāde nemaina pārbaudes datumu.").font(.caption).foregroundStyle(.secondary)
                    }.padding(.top, 12)
                }.font(.caption).padding(.top, 8)
            }.padding(24)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { Button("Aizvērt", systemImage: "xmark") { dismiss() }.accessibilityIdentifier("study-close-detail") }
            ToolbarItem(placement: .topBarTrailing) { SaveButton(venueID: result.id, name: result.venue.name) }
        }
    }
}
#endif
