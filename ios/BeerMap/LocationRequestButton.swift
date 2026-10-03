import SwiftUI
import UIKit

// Feedback belongs to the control that requested the fix. A filter sheet and
// the map can coexist without both trying to present the same alert.
struct LocationRequestButton<Label: View>: View {
    @Environment(LocationProvider.self) private var location
    @State private var owner = UUID()
    @ViewBuilder let label: (Bool) -> Label

    private var feedback: LocationFeedback? {
        location.feedback?.owner == owner ? location.feedback : nil
    }

    var body: some View {
        let presentedFeedback = feedback
        Button { location.locate(for: owner) } label: { label(location.isLocating) }
            .disabled(location.isLocating)
            .accessibilityValue(location.isLocating ? "Nosaka atrašanās vietu" : "")
            .alert(presentedFeedback?.issue.title ?? "", isPresented: Binding(
                get: { feedback != nil },
                set: { if !$0, let presentedFeedback { location.dismissFeedback(for: owner, matching: presentedFeedback.id) } }
            ), presenting: presentedFeedback) { feedback in
                if feedback.issue.offersSettings {
                    Button("Atvērt iestatījumus") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            Task { await UIApplication.shared.open(url) }
                        }
                    }
                    Button("Atcelt", role: .cancel) {}
                } else if feedback.issue.offersRetry {
                    Button("Mēģināt vēlreiz") {
                        // Let the current alert action finish before a new
                        // request can synchronously produce another issue.
                        Task { @MainActor in location.locate(for: owner) }
                    }
                    Button("Atcelt", role: .cancel) {}
                } else {
                    Button("Gatavs") {}
                }
            } message: { feedback in
                if let message = feedback.issue.message { Text(message) }
            }
            .onDisappear { location.dismissFeedback(for: owner) }
    }
}
