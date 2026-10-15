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
  /** État intermédiaire : régularité moyenne, valeur à surveiller. */
  warning: string;
  danger: string;
  /** Fonds teintés des indicateurs (température basse, température haute). */
  successSoft: string;
  dangerSoft: string;
  /** Doré des éléments premium (étoiles, badges). */
  gold: string;

  disabled: string;
  /**
   * Contenu posé sur une surface `disabled`. Visible mais atténué (≈3,6:1
   * en clair, ≈3,9:1 en sombre) : un bouton inactif doit se voir, sinon
   * l'utilisateur ne sait pas qu'il y a un bouton.
   */
  onDisabled: string;
  /** Rail d'un interrupteur actif : teinte atténuée de la couleur d'accent. */
  switchOn: string;
  separator: string;
  overlay: string;
  /** Voile posé sur un aperçu verrouillé : atténue sans masquer. */
  overlayVeil: string;

  /** Indexé par `task.id` : 0 biberon · 1 couche · 2 santé · 3 sommeil · 4 thermo · 5 allaitement. */
  category: readonly [string, string, string, string, string, string];
  /**
   * Même ordre que `category`, mais pour du TEXTE, pas une surface.
   * Les teintes de `category` sont assombries en mode sombre pour servir de
   * fond : utilisées comme couleur de texte sur une carte foncée elles tombent
   * à 1,5–3,5:1. Celles-ci sont éclaircies pour tenir le 4,5:1 sur `card`.
   */
  categoryAccent: readonly [string, string, string, string, string, string];
  /** Tire-lait : variante du bleu biberon, pour le distinguer de l'allaitement. */
  pumping: string;
  /** Sieste : nuance claire du violet sommeil, empilée sous la nuit. */
  napColor: string;
  /** Carte d'export, hors palette de catégories. */
  export: string;
  /**
   * Texte d'un appel premium : la surface est `card`, seule la bordure est
   * dorée. D'où une valeur par thème — brun foncé sur carte blanche (15,2:1),
   * doré clair sur carte sombre (8,2:1). Un ton unique échoue d'un côté ou de
   * l'autre.
   */
  goldText: string;

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
  warning: '#E29656',
  danger: '#E53935',
  successSoft: '#E5F5E5',
  dangerSoft: '#FFE5E5',
  gold: '#E8960A',

  disabled: '#E8D5C4',
  onDisabled: '#7A6A61',
  switchOn: '#F0C4BB',
  separator: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.45)',
  overlayVeil: 'rgba(255,255,255,0.68)',

  category: ['#34777B', '#C75B4A', '#6B8DEA', '#E29656', '#4F469F', '#1AAAAA'],
  // En clair, le texte reprend exactement les teintes de catégorie : aucun
  // changement d'apparence par rapport à l'existant.
  categoryAccent: ['#34777B', '#C75B4A', '#6B8DEA', '#E29656', '#4F469F', '#1AAAAA'],
  pumping: '#1A7F8C',
  napColor: '#A89FD8',
  export: '#4A7FC1',
  goldText: '#3B1F00',

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
  warning: '#E8A86B',
  danger: '#EF6C60',
  successSoft: '#1D2E23',
  dangerSoft: '#33201E',
  gold: '#E8A93C',

  disabled: '#4A3B35',
  onDisabled: '#A69B93',
  switchOn: '#7A3E33',
  separator: '#3A2E29',
  overlay: 'rgba(0,0,0,0.65)',
  overlayVeil: 'rgba(23,18,15,0.72)',

  // Teinte conservée, luminosité descendue : une catégorie reste reconnaissable
  // sans éblouir lors d'une tétée nocturne.
  category: ['#2A5457', '#8E4035', '#4B5F9B', '#9A663A', '#3B3470', '#157373'],
  // Éclaircies jusqu'à 4,5:1 minimum sur card (#231B17) : 4,84 · 5,48 · 5,34 ·
  // 7,04 · 5,07 · 5,94.
  categoryAccent: ['#5C9295', '#D27B6E', '#6B8DEA', '#E29656', '#8C86C0', '#1AAAAA'],
  pumping: '#15636C',
  napColor: '#6A61A8',
  export: '#39608F',
  goldText: '#E8A93C',

  statusBar: 'light-content',
};

export const themes: Record<ThemeName, Theme> = { light: lightTheme, dark: darkTheme };
