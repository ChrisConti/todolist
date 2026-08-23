import Foundation
import WidgetKit
import ActivityKit

// MARK: - Live Activity allaitement
// IMPORTANT : struct dupliqué à l'identique dans BiberonWidget/NursingActivity.swift (cible extension).
// Le système apparie par nom de type + encodage Codable : les deux définitions doivent rester synchronisées.

struct NursingAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var leftRunning: Bool
    var leftStartRef: Date
    var leftElapsed: Double
    var rightRunning: Bool
    var rightStartRef: Date
    var rightElapsed: Double
    var startedAt: Date
  }
}

let nursingKillFlagKey = "nursingKilledByUser"

@available(iOS 16.2, *)
enum NursingActivityManager {

  static var hasActiveActivity: Bool {
    // Une activité swipée par l'utilisateur passe à .dismissed mais reste dans la liste :
    // seul l'état .active compte comme « encore affichée »
    Activity<NursingAttributes>.activities.contains { $0.activityState == .active }
  }

  // Appelé depuis applicationWillTerminate : kill volontaire de l'app par l'utilisateur.
  // On pose le drapeau (seulement si une session tournait) et on ferme la Live Activity
  // avant que le process ne meure — d'où l'attente synchrone courte.
  static func handleAppTermination() {
    guard hasActiveActivity else { return }
    UserDefaults.standard.set(true, forKey: nursingKillFlagKey)
    let sem = DispatchSemaphore(value: 0)
    Task {
      for activity in Activity<NursingAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      sem.signal()
    }
    _ = sem.wait(timeout: .now() + 2)
  }

  static func contentState(from payload: NSDictionary) -> NursingAttributes.ContentState? {
    guard
      let leftStartRef  = payload["leftStartRef"]  as? Double,
      let leftElapsed   = payload["leftElapsed"]   as? Double,
      let rightStartRef = payload["rightStartRef"] as? Double,
      let rightElapsed  = payload["rightElapsed"]  as? Double,
      let startedAt     = payload["startedAt"]     as? Double
    else { return nil }
    return NursingAttributes.ContentState(
      leftRunning:  payload["leftRunning"]  as? Bool ?? false,
      leftStartRef: Date(timeIntervalSince1970: leftStartRef / 1000),
      leftElapsed:  leftElapsed,
      rightRunning: payload["rightRunning"] as? Bool ?? false,
      rightStartRef: Date(timeIntervalSince1970: rightStartRef / 1000),
      rightElapsed: rightElapsed,
      startedAt:    Date(timeIntervalSince1970: startedAt / 1000)
    )
  }

  static func sync(_ payload: NSDictionary) {
    guard let state = contentState(from: payload) else { return }
    // Une nouvelle session démarre : un éventuel drapeau de kill précédent ne la concerne pas
    UserDefaults.standard.removeObject(forKey: nursingKillFlagKey)
    let content = ActivityContent(state: state, staleDate: nil)
    Task {
      if let existing = Activity<NursingAttributes>.activities.first {
        await existing.update(content)
      } else if ActivityAuthorizationInfo().areActivitiesEnabled {
        _ = try? Activity.request(attributes: NursingAttributes(), content: content)
      }
    }
  }

  static func end() {
    Task {
      for activity in Activity<NursingAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}

@objc(WidgetBridge)
class WidgetBridge: NSObject {

  private let appGroupID  = "group.com.tribubaby.shared"
  private let dataKey     = "lastBottle"
  private let premiumKey  = "isPremium"

  @objc func saveLastBottle(_ ml: Int, milkType: String, timestamp: Double) {
    struct Bottle: Codable {
      let ml: Int
      let milkType: String
      let date: Date
    }

    let bottle = Bottle(ml: ml, milkType: milkType, date: Date(timeIntervalSince1970: timestamp))

    guard
      let defaults = UserDefaults(suiteName: appGroupID),
      let data     = try? JSONEncoder().encode(bottle)
    else { return }

    defaults.set(data, forKey: dataKey)

    // Reload widget immediately
    WidgetCenter.shared.reloadAllTimelines()
  }

  @objc func savePremiumStatus(_ isPremium: Bool) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
    defaults.set(isPremium, forKey: premiumKey)
    WidgetCenter.shared.reloadAllTimelines()
  }

  @objc func startNursingActivity(_ payload: NSDictionary) {
    if #available(iOS 16.2, *) { NursingActivityManager.sync(payload) }
  }

  @objc func updateNursingActivity(_ payload: NSDictionary) {
    if #available(iOS 16.2, *) { NursingActivityManager.sync(payload) }
  }

  @objc func endNursingActivity() {
    if #available(iOS 16.2, *) { NursingActivityManager.end() }
  }

  @objc func hasNursingActivity(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      resolve(NursingActivityManager.hasActiveActivity)
    } else {
      resolve(false)
    }
  }

  @objc func consumeNursingKillFlag(_ resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    let killed = UserDefaults.standard.bool(forKey: nursingKillFlagKey)
    UserDefaults.standard.removeObject(forKey: nursingKillFlagKey)
    resolve(killed)
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
