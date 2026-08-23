import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Attributes
// IMPORTANT : ce struct est dupliqué à l'identique dans tribubaby/WidgetBridge.swift (cible app).
// Le système apparie les Live Activities par nom de type + encodage Codable : les deux
// définitions doivent rester strictement synchronisées.

struct NursingAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var leftRunning: Bool
    var leftStartRef: Date   // référence chrono = now - elapsed, utilisée quand le côté tourne
    var leftElapsed: Double  // secondes cumulées, utilisées quand le côté est en pause
    var rightRunning: Bool
    var rightStartRef: Date
    var rightElapsed: Double
    var startedAt: Date      // premier ▶️ de la session (= date de la future tâche)
  }
}

// MARK: - Helpers

private let chronoUpperBound: TimeInterval = 8 * 3600 // ActivityKit termine de toute façon à 8h

private func staticTime(_ seconds: Double) -> String {
  let s = Int(seconds)
  let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
  if h > 0 { return String(format: "%d:%02d:%02d", h, m, sec) }
  return String(format: "%02d:%02d", m, sec)
}

private struct SideView: View {
  let label: String
  let running: Bool
  let startRef: Date
  let elapsed: Double
  var compact: Bool = false

  var body: some View {
    VStack(spacing: 2) {
      Text(label)
        .font(.caption2)
        .foregroundColor(.white.opacity(0.8))
      if running {
        Text(timerInterval: startRef...startRef.addingTimeInterval(chronoUpperBound), countsDown: false)
          .font(compact ? .callout : .title3.weight(.bold))
          .monospacedDigit()
          .foregroundColor(.white)
          .multilineTextAlignment(.center)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .frame(maxWidth: compact ? 64 : 80)
      } else {
        Text(staticTime(elapsed))
          .font(compact ? .callout : .title3.weight(.bold))
          .monospacedDigit()
          .foregroundColor(.white.opacity(elapsed > 0 ? 1 : 0.4))
      }
    }
  }
}

private func loc(_ key: String) -> String {
  NSLocalizedString(key, comment: "")
}

// MARK: - Live Activity

struct NursingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: NursingAttributes.self) { context in
      // Lock screen / bannière : visuels à gauche, heure de démarrage en vedette, chronos à droite
      HStack(spacing: 12) {
        HStack(alignment: .bottom, spacing: 2) {
          Image("TribuBaby")
          Text("🤱")
            .font(.system(size: 22))
        }
        VStack(alignment: .leading, spacing: 0) {
          Text(loc("nursing.startedAtLabel"))
            .font(.caption)
            .foregroundColor(.white.opacity(0.85))
          Text(context.state.startedAt.formatted(date: .omitted, time: .shortened))
            .font(.title2.weight(.bold))
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        Spacer()
        HStack(spacing: 16) {
          SideView(label: loc("nursing.left"), running: context.state.leftRunning,
                   startRef: context.state.leftStartRef, elapsed: context.state.leftElapsed)
          SideView(label: loc("nursing.right"), running: context.state.rightRunning,
                   startRef: context.state.rightStartRef, elapsed: context.state.rightElapsed)
        }
      }
      .padding(16)
      .activityBackgroundTint(Color(red: 0.78, green: 0.36, blue: 0.29)) // #C75B4A
      .activitySystemActionForegroundColor(.white)
      .widgetURL(URL(string: "com.tribubaby.tribubaby://nursing"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text("🤱 \(loc("nursing.title"))")
              .font(.headline)
            Text(String(format: loc("nursing.startedAt"), context.state.startedAt.formatted(date: .omitted, time: .shortened)))
              .font(.caption2)
              .foregroundColor(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          HStack(spacing: 16) {
            SideView(label: loc("nursing.left"), running: context.state.leftRunning,
                     startRef: context.state.leftStartRef, elapsed: context.state.leftElapsed, compact: true)
            SideView(label: loc("nursing.right"), running: context.state.rightRunning,
                     startRef: context.state.rightStartRef, elapsed: context.state.rightElapsed, compact: true)
          }
        }
      } compactLeading: {
        Text("🤱")
      } compactTrailing: {
        compactChrono(context.state)
      } minimal: {
        Text("🤱")
      }
      .widgetURL(URL(string: "com.tribubaby.tribubaby://nursing"))
    }
  }

  @ViewBuilder
  private func compactChrono(_ state: NursingAttributes.ContentState) -> some View {
    if state.leftRunning {
      Text(timerInterval: state.leftStartRef...state.leftStartRef.addingTimeInterval(chronoUpperBound), countsDown: false)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: 64)
        .multilineTextAlignment(.trailing)
    } else if state.rightRunning {
      Text(timerInterval: state.rightStartRef...state.rightStartRef.addingTimeInterval(chronoUpperBound), countsDown: false)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: 64)
        .multilineTextAlignment(.trailing)
    } else {
      Text(staticTime(state.leftElapsed + state.rightElapsed))
        .monospacedDigit()
    }
  }
}
