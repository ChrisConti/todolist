import { NativeModules, Platform } from 'react-native';

const { WidgetBridge } = NativeModules;

/**
 * Update the biberon widget with the latest bottle data.
 * iOS only — no-op on Android.
 */
export function updateBiberonWidget(ml: number, milkType: string | null, date: Date) {
  if (Platform.OS !== 'ios' || !WidgetBridge) return;
  WidgetBridge.saveLastBottle(ml, milkType ?? '', date.getTime() / 1000);
}
