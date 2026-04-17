import { NativeModules } from 'react-native';

const { WidgetBridge } = NativeModules;

/**
 * Update the biberon widget with the latest bottle data.
 * Works on iOS and Android. No-op if the native module is unavailable.
 */
export function updateBiberonWidget(ml: number, milkType: string | null, date: Date) {
  if (!WidgetBridge) return;
  WidgetBridge.saveLastBottle(ml, milkType ?? '', date.getTime() / 1000);
}
