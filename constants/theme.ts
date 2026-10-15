/**
 * Jetons de couleur de l'app, en clair et en sombre.
 *
 * Source unique : aucun écran ne doit plus écrire de couleur en dur. Avant cette
 * centralisation, 84 teintes distinctes étaient dispersées en 1 085 occurrences,
 * dont 217 fois le seul terracotta.
 *
 * Les valeurs claires sont celles d'aujourd'hui, reprises à l'identique — passer en
 * thème ne doit rien changer à l'apparence actuelle.
 */

export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  dark: boolean;

  /** Surfaces pleines (boutons, FAB) — garde le terracotta d'origine dans les deux thèmes. */
  primary: string;
  /** Texte et traits colorés — éclairci en sombre, où #C75B4A devient illisible. */
  accent: string;
  /** Contenu posé sur `primary`. */
  onPrimary: string;

  /**
   * Fond des en-têtes d'écran. Terracotta en clair ; en sombre, un bandeau pleine
   * largeur rallumerait l'écran et annulerait le bénéfice du mode, donc il s'aligne
   * sur la carte. Six écrans ont leur propre en-tête : la règle vit ici, pas chez eux.
   */
  headerBackground: string;
  onHeader: string;

  background: string;
  card: string;
  /** Surface douce : puces, champs, états inactifs. */
  soft: string;
  border: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  /** Contenu posé sur une carte de catégorie colorée. */
  onCategory: string;

  success: string;
  danger: string;
  /** Doré des éléments premium (étoiles, badges). */
  gold: string;

  disabled: string;
  separator: string;
  overlay: string;

  /** Indexé par `task.id` : 0 biberon · 1 couche · 2 santé · 3 sommeil · 4 thermo · 5 allaitement. */
  category: readonly [string, string, string, string, string, string];

  /** Barre de statut : clair sur fond foncé, et inversement. */
  statusBar: 'light-content' | 'dark-content';
}

export const lightTheme: Theme = {
  name: 'light',
  dark: false,

  primary: '#C75B4A',
  accent: '#C75B4A',
  onPrimary: '#F6F0EB',

  headerBackground: '#C75B4A',
  onHeader: '#F6F0EB',

  background: '#FDF1E7',
  card: '#FFFFFF',
  soft: '#F6F0EB',
  border: '#EADFD6',

  text: '#333333',
  textSecondary: '#7A8889',
  textMuted: '#9BA3A4',
  onCategory: '#F6F0EB',

  success: '#4CAF50',
  danger: '#E53935',
  gold: '#E8960A',

  disabled: '#E8D5C4',
  separator: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.45)',

  category: ['#34777B', '#C75B4A', '#6B8DEA', '#E29656', '#4F469F', '#1AAAAA'],

  statusBar: 'light-content',
};

export const darkTheme: Theme = {
  name: 'dark',
  dark: true,

  primary: '#C75B4A',
  accent: '#E8846C',
  onPrimary: '#F6F0EB',

  // Noir chaud plutôt que gris neutre : il prolonge la crème au lieu de la contredire.
  headerBackground: '#231B17',
  onHeader: '#F2E9E2',

  background: '#17120F',
  card: '#231B17',
  soft: '#2E2420',
  border: '#3A2E29',

  text: '#F2E9E2',
  textSecondary: '#A69B93',
  textMuted: '#8A7B73',
  onCategory: '#F6F0EB',

  success: '#6FBF74',
  danger: '#EF6C60',
  gold: '#E8A93C',

  disabled: '#4A3B35',
  separator: '#3A2E29',
  overlay: 'rgba(0,0,0,0.65)',

  // Teinte conservée, luminosité descendue : une catégorie reste reconnaissable
  // sans éblouir lors d'une tétée nocturne.
  category: ['#2A5457', '#8E4035', '#4B5F9B', '#9A663A', '#3B3470', '#157373'],

  statusBar: 'light-content',
};

export const themes: Record<ThemeName, Theme> = { light: lightTheme, dark: darkTheme };
