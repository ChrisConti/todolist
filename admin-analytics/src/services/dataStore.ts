import { useSyncExternalStore } from 'react';
import { getDocsFromServer, query, where, Timestamp, type QuerySnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
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

/**
 * Bébés utiles à une période, sans lire toute la collection (lire Baby en entier prend
 * ~100 s : les tâches y sont embarquées) :
 * - ceux créés entre start et end (createdDate est un Timestamp pour tous les bébés
 *   récents ; seuls des bébés anciens ont l'ancien champ texte CreatedDate) ;
 * - ceux auxquels appartiennent les comptes donnés (comptes de la période qui ont
 *   rejoint un bébé plus ancien), par paquets de 30 (limite d'array-contains-any).
 */
const periodCache = new Map<string, Promise<QueryDocumentSnapshot[]>>();

export const getBabiesForPeriod = (start: Date, end: Date, userIds: string[]): Promise<QueryDocumentSnapshot[]> => {
  const key = `${start.getTime()}|${end.getTime()}|${[...userIds].sort().join(',')}`;
  const cached = periodCache.get(key);
  if (cached) return cached;

  const created = query(
    babiesRef,
    where('createdDate', '>=', Timestamp.fromDate(start)),
    where('createdDate', '<=', Timestamp.fromDate(end)),
  );
  const byMembers = [];
  for (let i = 0; i < userIds.length; i += 30) {
    byMembers.push(query(babiesRef, where('user', 'array-contains-any', userIds.slice(i, i + 30))));
  }
  const promise = markLoaded(Promise.all([created, ...byMembers].map((q) => getDocsFromServer(q))))
    .then((snaps) => {
      const byId = new Map<string, QueryDocumentSnapshot>();
      snaps.forEach((s) => s.docs.forEach((d) => byId.set(d.id, d)));
      return [...byId.values()];
    })
    .catch((e) => {
      periodCache.delete(key);
      throw e;
    });
  periodCache.set(key, promise);
  return promise;
};

/** Oublie les données en mémoire ; les onglets abonnés via useDataVersion rechargent. */
export const invalidateData = () => {
  usersPromise = null;
  babiesPromise = null;
  installsPromise = null;
  periodCache.clear();
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
