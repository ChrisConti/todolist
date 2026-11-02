import { useSyncExternalStore } from 'react';
import { getDocsFromServer, type QuerySnapshot } from 'firebase/firestore';
import { usersRef, babiesRef, appInstallsRef } from '../config/firebase';

/**
 * Users, Baby et appInstalls lus une seule fois par visite, partagés entre tous les
 * onglets. Avant, chaque onglet — et chaque lettre tapée dans la recherche — relisait
 * toute la base : ~6 500 lectures et ~177 Mo par ouverture (les tâches sont embarquées
 * dans Baby). Le bouton « Rafraîchir » (Layout) relit tout via invalidateData().
 */

let usersPromise: Promise<QuerySnapshot> | null = null;
let babiesPromise: Promise<QuerySnapshot> | null = null;
let installsPromise: Promise<QuerySnapshot | { docs: [] }> | null = null;

let version = 0;
let loadedAt: Date | null = null;
const listeners = new Set<() => void>();

const markLoaded = <T,>(p: Promise<T>): Promise<T> =>
  p.then((r) => {
    if (!loadedAt) {
      loadedAt = new Date();
      listeners.forEach((l) => l());
    }
    return r;
  });

// Une erreur n'est pas mise en cache : la tentative suivante relit le serveur.
export const getUsersSnapshot = (): Promise<QuerySnapshot> =>
  (usersPromise ??= markLoaded(getDocsFromServer(usersRef)).catch((e) => {
    usersPromise = null;
    throw e;
  }));

export const getBabiesSnapshot = (): Promise<QuerySnapshot> =>
  (babiesPromise ??= markLoaded(getDocsFromServer(babiesRef)).catch((e) => {
    babiesPromise = null;
    throw e;
  }));

// appInstalls peut ne pas exister : vide plutôt qu'une erreur, comme avant.
export const getInstallsSnapshot = (): Promise<QuerySnapshot | { docs: [] }> =>
  (installsPromise ??= getDocsFromServer(appInstallsRef).catch((e) => {
    console.warn('AppInstalls collection not accessible (may not exist yet):', e);
    return { docs: [] as [] };
  }));

/** Oublie les données en mémoire ; les onglets abonnés via useDataVersion rechargent. */
export const invalidateData = () => {
  usersPromise = null;
  babiesPromise = null;
  installsPromise = null;
  loadedAt = null;
  version += 1;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** À mettre dans les dépendances des effets de chargement. */
export const useDataVersion = () => useSyncExternalStore(subscribe, () => version);

/** Heure du dernier chargement depuis le serveur (null tant qu'il est en cours). */
export const useDataLoadedAt = () => useSyncExternalStore(subscribe, () => loadedAt);
