import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { WidgetBridge } = NativeModules;

export interface NursingActivityState {
  leftRunning: boolean;
  leftStartRef: number; // Unix ms — référence chrono (now - elapsed*1000) quand le côté tourne
  leftElapsed: number; // secondes cumulées (affichées quand le côté est en pause)
  rightRunning: boolean;
  rightStartRef: number;
  rightElapsed: number;
  startedAt: number; // Unix ms — premier ▶️ de la session
}

// Live Activity iOS 16.2+ uniquement ; no-op sur Android et sur les binaires sans le module.
const available = Platform.OS === 'ios' && !!WidgetBridge?.startNursingActivity;

const ENABLED_KEY = 'nursing_live_activity_enabled';
// Posé uniquement après confirmation qu'une activité est réellement affichée :
// c'est le témoin qui permet de distinguer kill volontaire (activité supprimée par iOS)
// et kill système (activité toujours vivante).
const WITNESS_KEY = 'nursing_live_activity_witness';

export function isNursingActivitySupported(): boolean {
  return available;
}

export async function getNursingActivityEnabled(): Promise<boolean> {
  if (!available) return false;
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== '0';
  } catch {
    return true;
  }
}

export async function setNursingActivityEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch {}
  if (!enabled) endNursingActivity();
}

export function syncNursingActivity(state: NursingActivityState) {
  if (!available) return;
  WidgetBridge.startNursingActivity(state);
  // Confirme (après que la requête native ait eu le temps d'aboutir) qu'une activité
  // est bien affichée, et pose le témoin. Jamais posé si l'utilisateur a désactivé
  // les Activités en direct dans Réglages iOS.
  setTimeout(async () => {
    try {
      const alive = await WidgetBridge.hasNursingActivity();
      if (alive) await AsyncStorage.setItem(WITNESS_KEY, '1');
    } catch {}
  }, 700);
}

export function endNursingActivity() {
  if (!available) return;
  WidgetBridge.endNursingActivity();
  AsyncStorage.removeItem(WITNESS_KEY).catch(() => {});
}

/**
 * Vrai si la session d'allaitement doit être purgée. Deux signaux :
 * 1. Le drapeau natif posé par applicationWillTerminate — l'utilisateur a kill l'app
 *    pendant qu'une session tournait.
 * 2. Le témoin : une Live Activity avait été confirmée mais n'est plus à l'état actif —
 *    l'utilisateur l'a swipée de l'écran verrouillé, ou elle a expiré (8h).
 * Dans tous les cas : l'utilisateur n'en veut plus, on remet tout à zéro.
 */
export async function shouldDiscardNursingSession(): Promise<boolean> {
  if (!available) return false;
  try {
    if (WidgetBridge.consumeNursingKillFlag && (await WidgetBridge.consumeNursingKillFlag())) {
      return true;
    }
    const witness = await AsyncStorage.getItem(WITNESS_KEY);
    if (witness !== '1') return false;
    const alive = await WidgetBridge.hasNursingActivity();
    return !alive;
  } catch {
    return false;
  }
}

export async function clearNursingWitness(): Promise<void> {
  await AsyncStorage.removeItem(WITNESS_KEY).catch(() => {});
}
