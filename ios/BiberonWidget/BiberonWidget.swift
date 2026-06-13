import WidgetKit
import SwiftUI

// MARK: - Data model

struct LastBottle: Codable {
  let ml: Int
  let milkType: String  // "artificial" | "maternal" | ""
  let date: Date
}

// MARK: - App Group

private let appGroupID  = "group.com.tribubaby.shared"
private let dataKey     = "lastBottle"
private let premiumKey  = "isPremium"

func readLastBottle() -> LastBottle? {
  guard
    let defaults = UserDefaults(suiteName: appGroupID),
    let data     = defaults.data(forKey: dataKey)
  else { return nil }
  return try? JSONDecoder().decode(LastBottle.self, from: data)
}

func readIsPremium() -> Bool {
  UserDefaults(suiteName: appGroupID)?.bool(forKey: premiumKey) ?? false
}

// MARK: - Timeline

struct BiberonEntry: TimelineEntry {
  let date: Date
  let bottle: LastBottle?
  let isPremium: Bool
}

struct BiberonProvider: TimelineProvider {
  func placeholder(in context: Context) -> BiberonEntry {
    BiberonEntry(date: .now, bottle: LastBottle(ml: 150, milkType: "artificial", date: .now), isPremium: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (BiberonEntry) -> Void) {
    completion(BiberonEntry(date: .now, bottle: readLastBottle(), isPremium: readIsPremium()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BiberonEntry>) -> Void) {
    let entry    = BiberonEntry(date: .now, bottle: readLastBottle(), isPremium: readIsPremium())
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
  case "artificial": return NSLocalizedString("milk.artificial", comment: "")
  case "maternal":   return NSLocalizedString("milk.maternal", comment: "")
  default:           return NSLocalizedString("milk.other", comment: "")
  }
}

private func timeAgo(_ date: Date) -> String {
  let diff = Int(Date().timeIntervalSince(date))
  if diff < 60   { return NSLocalizedString("time.now", comment: "") }
  if diff < 3600 { return String(format: NSLocalizedString("time.minutes", comment: ""), diff / 60) }
  let h = diff / 3600
  let m = (diff % 3600) / 60
  if m == 0      { return String(format: NSLocalizedString("time.hours", comment: ""), h) }
  return String(format: NSLocalizedString("time.hoursMinutes", comment: ""), h, m)
}

private func formattedTime(_ date: Date) -> String {
  let f = DateFormatter()
  f.locale = Locale.current
  let lang = Locale.current.language.languageCode?.identifier ?? ""
  if lang == "en" {
    f.dateFormat = "h:mm a"
  } else {
    f.setLocalizedDateFormatFromTemplate("jmm")
  }
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

      if !entry.isPremium {
        VStack(spacing: 6) {
          Text("★")
            .font(.system(size: 22))
            .foregroundColor(Color(red: 0.91, green: 0.59, blue: 0.27))
          Text(NSLocalizedString("widget.premiumRequired", comment: ""))
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.white.opacity(0.9))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 10)
        }
      } else if let bottle = entry.bottle {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 5) {
            Text("🍼")
              .font(.system(size: 18))
            Text(NSLocalizedString("widget.title", comment: ""))
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
            Text(NSLocalizedString("unit.ml", comment: ""))
              .font(.system(size: 15, weight: .semibold))
              .foregroundColor(.white.opacity(0.8))
          }

          Text(timeAgo(bottle.date))
            .font(.system(size: 11))
            .foregroundColor(.white.opacity(0.65))
          Text(String(format: NSLocalizedString("widget.madeAt", comment: ""), formattedTime(bottle.date)))
            .font(.system(size: 11))
            .foregroundColor(.white.opacity(0.65))
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

      } else {
        VStack(spacing: 8) {
          Text("🍼")
            .font(.system(size: 28))
          Text(NSLocalizedString("widget.empty", comment: ""))
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
    .configurationDisplayName(LocalizedStringKey("widget.displayName"))
    .description(LocalizedStringKey("widget.description"))
    .supportedFamilies([.systemSmall])
  }
}

#Preview(as: .systemSmall) {
  BiberonWidget()
} timeline: {
  BiberonEntry(date: .now, bottle: LastBottle(ml: 150, milkType: "artificial", date: .now), isPremium: true)
  BiberonEntry(date: .now, bottle: nil, isPremium: true)
  BiberonEntry(date: .now, bottle: nil, isPremium: false)
}
