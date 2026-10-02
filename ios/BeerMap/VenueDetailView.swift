import SwiftUI

struct VenueDetailView: View {
    @Environment(BeerMapStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let result: VenueResult
    let hasCloseButton: Bool
    @State private var showSource = false

    var body: some View {
        let menu = store.menu(for: result.venue)
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(result.venue.name).font(.title2.weight(.semibold)).accessibilityIdentifier("venue-detail-name")
                    Text(result.venue.address).font(.subheadline).foregroundStyle(.secondary).textSelection(.enabled)
                    HStack(spacing: 8) {
                        Text(result.venue.kind)
                        if let isOpen = result.venue.openingHours?.isOpen(at: store.now) {
                            Text("·")
                            Text(isOpen ? "Pēc grafika atvērts" : "Pēc grafika slēgts")
                        }
                    }.font(.caption).foregroundStyle(.secondary)
                }
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text(store.filter.sort == .litre ? result.beer.litreLabel : result.beer.priceLabel)
                            .font(.system(size: 32, weight: .semibold, design: .rounded)).monospacedDigit()
                        Text(result.beer.volumeLabel).font(.subheadline).foregroundStyle(.secondary)
                    }
                    Text(result.beer.name).font(.subheadline).foregroundStyle(.secondary)
                    Text("Pārbaudīts \(store.checkedLabel)").font(.caption).foregroundStyle(.secondary)
                }
                HStack(spacing: 12) {
                    Link(destination: result.venue.directionsURL) { Label("Kājām uz vietu", systemImage: "figure.walk") }
                        .buttonStyle(.glassProminent).accessibilityIdentifier("directions")
                    ShareLink(item: result.venue.shareURL) { Image(systemName: "square.and.arrow.up").frame(minWidth: 20) }
                        .buttonStyle(.glass).accessibilityLabel("Dalīties ar vietu")
                }
                Divider()
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Aluskarte").font(.headline)
                        Spacer()
                        Text("\(result.venue.beers.count) izvēles").font(.caption).foregroundStyle(.secondary)
                    }
                    LazyVStack(spacing: 18) {
                        ForEach(menu.servings) { row in
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
                    Button { location.locate() } label: { Label("Noteikt manu atrašanās vietu", systemImage: "location") }
                    if let message = location.message { Text(message).font(.caption).foregroundStyle(.secondary) }
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
