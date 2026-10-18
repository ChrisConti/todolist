// Initiale affichée dans les avatars (profil, membres de la famille) : le nom,
// à défaut l'e-mail, à défaut un point d'interrogation.
export const initialOf = (name?: string | null, email?: string | null): string =>
  ((name || email || '?').trim().charAt(0) || '?').toUpperCase();
