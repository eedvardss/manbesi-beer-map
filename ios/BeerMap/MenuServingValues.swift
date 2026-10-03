import SwiftUI

// Consumes the cached, exact labels. Large text gets the full width for each
// value; ordinary text retains the compact serving/price columns.
struct MenuServingValues: View {
    @Environment(\.dynamicTypeSize) private var textSize
    let row: MenuServing
    let showLitre: Bool
    var litreFont: Font = .caption

    var body: some View {
        let layout = textSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
            : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
        layout {
            Text(row.volumeLabel).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier("serving-volume-\(row.id)")
            VStack(alignment: textSize.isAccessibilitySize ? .leading : .trailing, spacing: 3) {
                Text(row.priceLabel).fontWeight(.medium).monospacedDigit()
                    .fixedSize(horizontal: !textSize.isAccessibilitySize, vertical: true)
                    .accessibilityIdentifier("serving-price-\(row.id)")
                if showLitre, let label = row.litreLabel {
                    Text(label).font(litreFont).foregroundStyle(.secondary)
                        .fixedSize(horizontal: !textSize.isAccessibilitySize, vertical: true)
                        .accessibilityIdentifier("serving-litre-\(row.id)")
                }
            }
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
