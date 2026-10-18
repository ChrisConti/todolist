// Mise à jour obligatoire : règles pures, sans Firestore ni React, pour être testables.
//
// Le document Firestore Config/app porte la version minimale acceptée par plateforme :
//   minVersionIos: "1.3.7"      minVersionAndroid: "1.3.7"
//   messageFr / messageEn / messageEs : texte libre facultatif, affiché sous le message standard
// Document absent, champ vide ou illisible : personne n'est bloqué.

const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

// "1.3" → [1, 3, 0]. null si la chaîne n'est pas une version numérique.
export function parseVersion(version: unknown): number[] | null {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim();
  if (!VERSION_PATTERN.test(trimmed)) return null;
  const parts = trimmed.split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  return parts;
}

// Comparaison numérique segment par segment : "1.10.0" est plus récent que "1.9.0".
export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// En cas de doute (version courante ou minimale illisible), on ne bloque pas.
export function isUpdateRequired(currentVersion: unknown, minVersion: unknown): boolean {
  const current = parseVersion(currentVersion);
  const min = parseVersion(minVersion);
  if (!current || !min) return false;
  return compareVersions(current, min) < 0;
}

export function minVersionFor(config: Record<string, any> | undefined, platform: string): unknown {
  if (!config) return undefined;
  if (platform === 'ios') return config.minVersionIos;
  if (platform === 'android') return config.minVersionAndroid;
  return undefined;
}

const MESSAGE_FIELDS: Record<string, string> = { fr: 'messageFr', en: 'messageEn', es: 'messageEs' };

// Message libre dans la langue de l'utilisateur, sinon rien : jamais de texte dans une
// autre langue que celle de l'app.
export function customMessageFor(config: Record<string, any> | undefined, language: string): string | null {
  const field = MESSAGE_FIELDS[(language || '').slice(0, 2)];
  const message = field && config?.[field];
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}
