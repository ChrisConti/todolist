import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeName, themes, lightTheme } from '../constants/theme';
import { resolveTheme, ThemePreference } from '../utils/themeResolution';
import { usePremium } from './PremiumContext';

export type { ThemePreference };

const PREF_KEY = '@themePreference';
/**
 * Dernier thème réellement appliqué, relu avant que Firestore ne réponde.
 *
 * Sans ce cache, `isPremium` démarre à false et un premium en sombre verrait son app
 * s'ouvrir en clair puis basculer à chaque lancement — un flash blanc en pleine nuit,
 * précisément ce que le mode sombre doit éviter.
 */
const LAST_APPLIED_KEY = '@themeLastApplied';

interface ThemeContextType {
  theme: Theme;
  /** Choix de l'utilisateur, indépendamment de son droit à l'appliquer. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** false ⇒ le réglage est affiché mais verrouillé, et l'app reste en clair. */
  canUseDarkMode: boolean;
  /** true tant que la préférence stockée n'est pas lue : évite de peindre deux fois. */
  isHydrating: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  preference: 'system',
  setPreference: () => {},
  canUseDarkMode: false,
  isHydrating: true,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isPremium } = usePremium();

  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  const [isHydrating, setIsHydrating] = useState(true);
  // Vaut le dernier état premium connu tant que Firestore n'a pas répondu.
  const [optimisticPremium, setOptimisticPremium] = useState(false);
  const hasRealPremium = useRef(false);

  // Lecture au démarrage, avant tout rendu coloré.
  useEffect(() => {
    (async () => {
      try {
        const [stored, lastApplied] = await Promise.all([
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(LAST_APPLIED_KEY),
        ]);
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
        }
        // Le thème sombre n'a pu être appliqué que par un premium : s'il l'était au
        // dernier lancement, on le rétablit sans attendre la confirmation du serveur.
        if (lastApplied === 'dark') setOptimisticPremium(true);
      } catch {
        // Stockage indisponible : on reste sur les valeurs par défaut, clair et système.
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  // Dès que Firestore répond, sa valeur fait foi et remplace l'optimiste.
  useEffect(() => {
    if (isPremium) {
      hasRealPremium.current = true;
      setOptimisticPremium(true);
    } else if (hasRealPremium.current) {
      // Premium réellement perdu (déconnexion) : on retombe en clair.
      setOptimisticPremium(false);
    }
  }, [isPremium]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const canUseDarkMode = isPremium || optimisticPremium;
  const themeName: ThemeName = resolveTheme(preference, systemScheme as any, canUseDarkMode);
  const theme = themes[themeName];

  // Aligne les composants natifs (sélecteurs de date, claviers, alertes) sur notre
  // décision plutôt que sur celle du système : sans ça, un non-premium au téléphone
  // sombre aurait une app claire et des pickers sombres.
  useEffect(() => {
    if (isHydrating) return;
    Appearance.setColorScheme(themeName);
  }, [themeName, isHydrating]);

  useEffect(() => {
    if (isHydrating) return;
    AsyncStorage.setItem(LAST_APPLIED_KEY, themeName).catch(() => {});
  }, [themeName, isHydrating]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, canUseDarkMode, isHydrating }}>
      {children}
    </ThemeContext.Provider>
  );
};
