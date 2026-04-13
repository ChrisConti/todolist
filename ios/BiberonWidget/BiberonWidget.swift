import WidgetKit
import SwiftUI

// MARK: - Data model

struct LastBottle: Codable {
  let ml: Int
  let milkType: String  // "artificial" | "maternal" | ""
  let date: Date
}

// MARK: - App Group

private let appGroupID = "group.com.tribubaby.shared"
private let dataKey    = "lastBottle"

func readLastBottle() -> LastBottle? {
  guard
    let defaults = UserDefaults(suiteName: appGroupID),
    let data     = defaults.data(forKey: dataKey)
  else { return nil }
  return try? JSONDecoder().decode(LastBottle.self, from: data)
}

// MARK: - Timeline

struct BiberonEntry: TimelineEntry {
  let date: Date
  let bottle: LastBottle?
}

struct BiberonProvider: TimelineProvider {
  func placeholder(in context: Context) -> BiberonEntry {
    BiberonEntry(date: .now, bottle: LastBottle(ml: 150, milkType: "artificial", date: .now))
  }

  func getSnapshot(in context: Context, completion: @escaping (BiberonEntry) -> Void) {
    completion(BiberonEntry(date: .now, bottle: readLastBottle()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BiberonEntry>) -> Void) {
    let entry    = BiberonEntry(date: .now, bottle: readLastBottle())
    let next     = Calendar.current.date(byAdding: .minute, value: 5, to: .now)!
    let timeline = Timeline(entries: [entry], policy: .after(next))
    completion(timeline)
  }
}

// MARK: - Helpers

private func milkIcon(_ type: String) -> String {
  switch type {
  case "artificial": return "🥛"
  case "maternal":   return "🤱"
  default:           return "🍼"
  }
}

private func milkLabel(_ type: String) -> String {
  switch type {
  case "artificial": return "Artificiel"
  case "maternal":   return "Maternel"
  default:           return "Lait"
  }
}

private func timeAgo(_ date: Date) -> String {
  let diff = Int(Date().timeIntervalSince(date))
  if diff < 60   { return "À l'instant" }
  if diff < 3600 { return "Il y a \(diff / 60) min" }
  let h = diff / 3600
  let m = (diff % 3600) / 60
  if m == 0      { return "Il y a \(h)h" }
  return "Il y a \(h)h\(m)m"
}

private func formattedTime(_ date: Date) -> String {
  let f = DateFormatter()
  f.dateFormat = "HH:mm"
  return f.string(from: date)
}

// MARK: - View

struct BiberonWidgetView: View {
  let entry: BiberonEntry
  private let bibColor = Color(red: 0.204, green: 0.467, blue: 0.482) // #34777B

  var body: some View {
    ZStack {
      ContainerRelativeShape()
        .fill(bibColor.gradient)

      if let bottle = entry.bottle {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 5) {
            Text("🍼")
              .font(.system(size: 18))
            Text("Biberon")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.white.opacity(0.85))
          }

          Spacer()

          HStack(alignment: .lastTextBaseline, spacing: 3) {
            Text("\(bottle.ml)")
              .font(.system(size: 34, weight: .heavy))
              .foregroundColor(.white)
              .minimumScaleFactor(0.7)
              .lineLimit(1)
            Text("ml")
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white.opacity(0.8))
          }

          HStack(spacing: 4) {
            Text(milkIcon(bottle.milkType))
              .font(.system(size: 12))
            Text(milkLabel(bottle.milkType))
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(.white.opacity(0.9))
          }

          HStack(spacing: 4) {
            Text(formattedTime(bottle.date))
            Text("·")
            Text(timeAgo(bottle.date))
          }
          .font(.system(size: 11))
          .foregroundColor(.white.opacity(0.65))
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

      } else {
        VStack(spacing: 8) {
          Text("🍼")
            .font(.system(size: 28))
          Text("Aucun biberon\nenregistré")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.white.opacity(0.8))
            .multilineTextAlignment(.center)
        }
      }
    }
  }
}

// MARK: - Widget

struct BiberonWidget: Widget {
  let kind = "BiberonWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: BiberonProvider()) { entry in
      BiberonWidgetView(entry: entry)
        .containerBackground(Color(red: 0.204, green: 0.467, blue: 0.482).gradient, for: .widget)
    }
    .configurationDisplayName("Dernier biberon")
    .description("Affiche le dernier biberon donné.")
    .supportedFamilies([.systemSmall])
  }
}

#Preview(as: .systemSmall) {
  BiberonWidget()
} timeline: {
  BiberonEntry(date: .now, bottle: LastBottle(ml: 150, milkType: "artificial", date: .now))
  BiberonEntry(date: .now, bottle: nil)
}
