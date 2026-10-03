import SwiftUI

struct VenueDetailView: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var textSize
    @ScaledMetric(relativeTo: .largeTitle) private var priceSize = 32.0
    let result: VenueResult
    let hasCloseButton: Bool
    @State private var showSource = false

    var body: some View {
        let menu = store.menu(for: result.venue)
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(result.venue.name).font(.title2.weight(.semibold))
                        .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("venue-detail-name")
                    Text(result.venue.address).font(.subheadline).foregroundStyle(.secondary).textSelection(.enabled)
                    let metadataLayout = textSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
                        : AnyLayout(HStackLayout(spacing: 8))
                    metadataLayout {
                        Text(result.venue.kind)
                        if let isOpen = result.venue.openingHours?.isOpen(at: store.now) {
                            if !textSize.isAccessibilitySize { Text("·") }
                            Text(isOpen ? "Pēc grafika atvērts" : "Pēc grafika slēgts")
                        }
                    }.font(.caption).foregroundStyle(.secondary)
                }
                VStack(alignment: .leading, spacing: 6) {
                    let quoteLayout = textSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
                        : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 10))
                    quoteLayout {
                        Text(store.filter.sort == .litre ? result.beer.litreLabel : result.beer.priceLabel)
                            .font(.system(size: priceSize, weight: .semibold, design: .rounded)).monospacedDigit()
                            .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("venue-selected-price")
                        Text(result.beer.volumeLabel).font(.subheadline).foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("venue-selected-volume")
                    }
                    Text(result.beer.name).font(.subheadline).foregroundStyle(.secondary)
                    Text("Pārbaudīts \(store.checkedLabel)").font(.caption).foregroundStyle(.secondary)
                }
                if textSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 12) {
                        Link(destination: result.venue.directionsURL) {
                            Text("Kājām uz vietu").font(.subheadline.weight(.semibold))
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.glassProminent).buttonBorderShape(.roundedRectangle(radius: 14))
                        .accessibilityIdentifier("directions")
                        ShareLink(item: result.venue.shareURL) { Label("Dalīties", systemImage: "square.and.arrow.up") }
                            .font(.subheadline).frame(minHeight: 44).accessibilityLabel("Dalīties ar vietu")
                    }
                } else {
                    HStack(spacing: 12) {
                        Link(destination: result.venue.directionsURL) { Label("Kājām uz vietu", systemImage: "figure.walk") }
                            .buttonStyle(.glassProminent).accessibilityIdentifier("directions")
                        ShareLink(item: result.venue.shareURL) { Image(systemName: "square.and.arrow.up").frame(minWidth: 20) }
                            .buttonStyle(.glass).accessibilityLabel("Dalīties ar vietu")
                    }
                }
                Divider()
                VStack(alignment: .leading, spacing: 16) {
                    let headingLayout = textSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
                        : AnyLayout(HStackLayout())
                    headingLayout {
                        Text("Aluskarte").font(.headline).fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader).accessibilityIdentifier("venue-menu-heading")
                        if !textSize.isAccessibilitySize { Spacer() }
                        Text("\(menu.servings.count) \(menu.servings.count == 1 ? "porcija" : "porcijas")")
                            .font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("venue-menu-count")
                    }
                    LazyVStack(spacing: 18) {
                        ForEach(menu.servings) { row in
                            if textSize.isAccessibilitySize {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(row.serving.name).font(.subheadline)
                                        .fixedSize(horizontal: false, vertical: true)
                                    MenuServingValues(row: row, showLitre: true, litreFont: .caption2)
                                }
                                .accessibilityElement(children: .combine)
                                .accessibilityIdentifier("venue-serving-\(row.id)")
                            } else {
                                HStack(alignment: .top, spacing: 16) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(row.serving.name).font(.subheadline)
                                        Text(row.volumeLabel).font(.caption).foregroundStyle(.secondary)
                                    }.frame(maxWidth: .infinity, alignment: .leading)
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(row.priceLabel).font(.subheadline.weight(.medium)).monospacedDigit()
                                        if let label = row.litreLabel { Text(label).font(.caption2).foregroundStyle(.secondary) }
                                    }
                                }
                                .accessibilityElement(children: .combine)
                                .accessibilityIdentifier("venue-serving-\(row.id)")
                            }
                        }
                    }
                }
                Divider()
                DisclosureGroup("Cenu avots", isExpanded: $showSource) {
                    VStack(alignment: .leading, spacing: 12) {
                        Link(result.venue.sourceLabel, destination: URL(string: result.venue.sourceUrl)!)
                        Text("Cenas pārbaudītas \(store.checkedLabel). Tās var būt mainījušās; aktuālo cenu pārbaudi vietas ēdienkartē. Datu lejupielāde nemaina pārbaudes datumu.")
                            .font(.caption).foregroundStyle(.secondary)
                        if let hours = result.venue.openingHours {
                            Link("Darba laika avots · \(hours.checkedAt)", destination: URL(string: hours.sourceUrl)!)
                            if let note = hours.note { Text(note).font(.caption).foregroundStyle(.secondary) }
                        }
                    }.padding(.top, 12)
                }
                .font(.subheadline)
            }.padding(22)
        }
        .accessibilityIdentifier("venue-detail-scroll")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { SaveButton(venueID: result.id, name: result.venue.name) }
            if hasCloseButton {
                ToolbarItem(placement: .topBarLeading) { Button("Aizvērt", systemImage: "xmark") { dismiss() }.accessibilityIdentifier("close-detail") }
            }
        }
    }
}

struct FiltersView: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(LocationProvider.self) private var location
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        @Bindable var store = store
        Form {
            Section("Kārtot vietas") {
                ForEach(VenueSort.allCases) { sort in
                    Button { store.filter.sort = sort } label: {
                        HStack { Text(sort.label); Spacer(); if store.filter.sort == sort { Image(systemName: "checkmark") } }
                    }
                    .foregroundStyle(.primary)
                    .disabled(sort == .distance && location.coordinate == nil)
                }
                if location.coordinate == nil {
                    LocationRequestButton { isLocating in
                        HStack {
                            Label("Noteikt manu atrašanās vietu", systemImage: "location")
                            if isLocating { Spacer(); ProgressView() }
                        }
                    }
                    .accessibilityIdentifier("filter-locate")
                }
            }
            Section {
                Picker("Cena par porciju", selection: $store.filter.priceBand) { ForEach(PriceBand.allCases) { Text($0.label).tag($0) } }
                Picker("Tilpums", selection: $store.filter.size) { ForEach(ServingSize.allCases) { Text($0.label).tag($0) } }
            } footer: { Text("Salīdzinām vienu un to pašu porciju: izvēlēto alu, tilpumu un cenu. Litru cenās ietilpst arī lielās porcijas, ja tilpuma filtrs tās neizslēdz.") }
            Section {
                Toggle("Tikai atvērtās vietas", isOn: $store.filter.openOnly)
            } footer: { Text("Pēc publicētā darba laika Rīgas laika zonā. Vietas bez zināma grafika šajā filtrā netiek rādītas.") }
            Section { Button("Notīrīt filtrus") { store.resetFilters() } }
        }
        .navigationTitle("Filtri")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Gatavs") { dismiss() } } }
    }
}

struct AboutView: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Form {
            Section {
                Label("Rīgas alus", systemImage: "map").font(.title2.weight(.semibold))
                Text("Atrodi vietu, salīdzini cenas, dodies kājām.").foregroundStyle(.secondary)
                LabeledContent("Vietas", value: "\(store.venues.count)")
                LabeledContent("Cenas pārbaudītas", value: store.checkedLabel)
                Link("Atvērt manbesi.lv", destination: URL(string: "https://manbesi.lv")!)
            }
            Section("Dati tavā kabatā") {
                Text("Karte un saglabātās vietas darbojas arī bez interneta. Kartes pamatnei un jaunāko datu ielādei vajadzīgs savienojums.")
                if let error = store.errorMessage { Text(error).font(.caption).foregroundStyle(.secondary) }
                Button { Task { await store.refresh() } } label: {
                    HStack { Text("Atjaunot datus"); Spacer(); if store.isRefreshing { ProgressView() } }
                }.disabled(store.isRefreshing)
            }
            Section("Tava atrašanās vieta") {
                Text("To izmantojam tikai attālumiem un tuvākajām vietām, kad tu to atļauj. Tā paliek ierīcē. Nav konta, reklāmu izsekošanas vai analītikas.")
            }
            Section("Precīza porcija") {
                Text("Cenu avoti ir vietu ēdienkartes un dokumentētā izpēte. Parādām tieši publicēto tilpumu; nezināmu tilpumu nepārvēršam litru cenā. “No” nozīmē sākumcenu.")
            }
        }
        .navigationTitle("Par karti")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Gatavs") { dismiss() } } }
    }
}
