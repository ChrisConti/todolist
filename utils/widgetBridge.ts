import { NativeModules } from 'react-native';

const { WidgetBridge } = NativeModules;

/**
 * Update the biberon widget with the latest bottle data.
 * Works on iOS and Android. No-op if the native module is unavailable.
 */
// Chaque plateforme n'expose pas forcément toutes les méthodes : on teste la méthode,
// pas seulement le module. Sans ça, savePremiumStatus (longtemps iOS seul) levait une
// TypeError non rattrapée dans le listener Firestore, fatale au démarrage sur Android.
export function updateBiberonWidget(ml: number, milkType: string | null, date: Date) {
  if (typeof WidgetBridge?.saveLastBottle !== 'function') return;
  WidgetBridge.saveLastBottle(ml, milkType ?? '', date.getTime() / 1000);
}

export function updateWidgetPremium(isPremium: boolean) {
  if (typeof WidgetBridge?.savePremiumStatus !== 'function') return;
  WidgetBridge.savePremiumStatus(isPremium);
}
