import Foundation
import WidgetKit

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

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
