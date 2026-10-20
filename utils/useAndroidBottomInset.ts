import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Hauteur de la barre de navigation Android (gestes ou 3 boutons). Avec targetSdk 35,
// Android 15 impose l'edge-to-edge : un bouton posé en bas d'écran passe dessous.
// 0 sur iOS, dont les écrans sont déjà validés tels quels.
export function useAndroidBottomInset(): number {
  const { bottom } = useSafeAreaInsets();
  return Platform.OS === 'android' ? bottom : 0;
}
