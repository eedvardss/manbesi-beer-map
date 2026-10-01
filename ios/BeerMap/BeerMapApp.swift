import SwiftUI

@main
struct BeerMapApp: App {
    @State private var store = BeerMapStore()
    @State private var location = LocationProvider()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(location)
                .tint(Theme.accent)
                .task { await store.refresh() }
                .onOpenURL { store.open($0) }
        }
    }
}

enum Theme {
    static let accent = Color(red: 0.78, green: 0.43, blue: 0.07)
    static let background = Color(.systemGroupedBackground)
}
