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

/**
 * Surcharge à poser sur `Appearance.setColorScheme`, ou `null` pour la lever.
 *
 * Cet appel aligne les composants natifs — sélecteurs de date, claviers,
 * alertes — sur notre décision. Mais c'est une surcharge au niveau de l'app :
 * une fois posée, `Appearance.getColorScheme()` et son écouteur renvoient la
 * surcharge, plus la valeur réelle du système.
 *
 * En mode « suivre le système », la poser revient donc à se couper de ce qu'on
 * prétend suivre : un premium au téléphone sombre voyait son app s'ouvrir en
 * clair le temps que le premium se charge, cette valeur claire devenait le
 * « système » perçu, et l'app restait claire pour de bon. C'était la
 * configuration par défaut.
 *
 * On ne pose donc la surcharge que lorsqu'on impose un thème. Quand on suit le
 * système, on la lève : les composants natifs suivent alors le système eux
 * aussi, ce qui est exactement voulu.
 */
export function nativeSchemeOverride(
  preference: ThemePreference,
  canUseDarkMode: boolean,
  resolved: ThemeName,
): ThemeName | null {
  const following = preference === 'system' && canUseDarkMode;
  return following ? null : resolved;
}
