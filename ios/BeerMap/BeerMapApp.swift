import SwiftUI

@main
struct BeerMapApp: App {
    @State private var store = BeerMapStore()
    @State private var location = LocationProvider()
    // Review overrides are isolated to UI-test launches; ordinary launches
    // continue to follow the system appearance.
    private let testColorScheme: ColorScheme? = {
        let arguments = ProcessInfo.processInfo.arguments
        guard arguments.contains("--uitesting") else { return nil }
        if arguments.contains("--test-dark") { return .dark }
        if arguments.contains("--test-light") { return .light }
        return nil
    }()

    var body: some Scene {
        WindowGroup {
            appContent
        }
    }

    @ViewBuilder private var appContent: some View {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--design-study") {
            DesignPrototypeRoot()
        } else {
            product
        }
#else
        product
#endif
    }

    private var product: some View {
        RootView()
            .environment(store)
            .environment(location)
            .tint(Theme.accent)
            .preferredColorScheme(testColorScheme)
            .task { await store.refresh() }
            .onOpenURL { store.open($0) }
    }
}

enum Theme {
    static let accent = Color(red: 0.78, green: 0.43, blue: 0.07)
    static let background = Color(.systemGroupedBackground)
}
