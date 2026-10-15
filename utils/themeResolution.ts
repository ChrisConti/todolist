import type { ThemeName } from '../constants/theme';

/** 'system' suit le téléphone ; 'light' et 'dark' forcent le choix de l'utilisateur. */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Thème effectivement appliqué.
 *
 * Fonction pure, isolée du contexte React pour être testable : c'est le seul endroit
 * où se croisent la préférence, le réglage du téléphone et le droit premium, donc
 * celui où une erreur passerait le plus facilement inaperçue.
 *
 * Le droit prime sur tout le reste : sans premium, l'app reste claire même si
 * l'utilisateur avait choisi « sombre » du temps où il y avait droit.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
  canUseDarkMode: boolean,
): ThemeName {
  if (!canUseDarkMode) return 'light';
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
