import {
  arrayRemove,
  arrayUnion,
  DocumentReference,
  getDocFromCache,
  getDocsFromCache,
  getDocsFromServer,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, babiesRef } from '../config.js';
import { log } from './logger';

// Écritures dans Baby.tasks[] sans relire tout le document.
//
// Avant : chaque écran téléchargeait la fiche complète (jusqu'à ~1 Mo pour un bébé
// de quelques mois), recomposait le tableau puis le réécrivait en entier. C'était
// lent, et une tâche ajoutée par le co-parent entre la lecture et l'écriture était
// écrasée sans erreur.

// L'identifiant du document Baby ne change jamais : une fois trouvé, inutile de le
// rechercher. Le champ `id` (code bébé) n'est pas l'identifiant du document.
const docRefByBabyID = new Map<string, DocumentReference>();

// Au-delà, l'écriture reste en file d'attente côté SDK et partira au retour du réseau.
export const WRITE_TIMEOUT_MS = 8000;

export type AddTaskResult = 'saved' | 'queued' | 'babyNotFound';
export type EditTaskResult = 'saved' | 'queued' | 'babyNotFound' | 'taskNotFound' | 'timeout';

export async function getBabyDocRef(babyID: string): Promise<DocumentReference | null> {
  const known = docRefByBabyID.get(babyID);
  if (known) return known;

  const babyQuery = query(babiesRef, where('id', '==', babyID));
  // Home garde un listener sur la fiche : elle est presque toujours dans le cache.
  // Seul l'identifiant nous intéresse, il ne peut pas être périmé.
  let snapshot = null;
  try {
    snapshot = await getDocsFromCache(babyQuery);
  } catch {
    snapshot = null;
  }
  if (!snapshot || snapshot.empty) {
    snapshot = await getDocsFromServer(babyQuery);
  }
  if (snapshot.empty) return null;

  const ref = snapshot.docs[0].ref;
  docRefByBabyID.set(babyID, ref);
  return ref;
}

// arrayUnion ajoute la tâche côté serveur, de façon atomique : rien à télécharger,
// et rien d'écrasé si l'autre parent écrit au même moment.
export async function addBabyTask(babyID: string, task: Record<string, any>): Promise<AddTaskResult> {
  const ref = await getBabyDocRef(babyID);
  if (!ref) return 'babyNotFound';

  const saved = updateDoc(ref, { tasks: arrayUnion(task) }).then(() => 'saved' as const);
  return withTimeout(saved, 'queued', 'Queued task write failed');
}

// Course contre WRITE_TIMEOUT_MS. L'opération n'est pas annulable : passé le délai, on la
// laisse aboutir et on journalise un éventuel échec.
async function withTimeout<T, L extends string>(operation: Promise<T>, lateResult: L, label: string): Promise<T | L> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<L>((resolve) => {
    timer = setTimeout(() => resolve(lateResult), WRITE_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([operation, timeout]);
    if (result === lateResult) {
      operation.catch((error) => log.error(label, 'babyTasks', error));
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

// La tâche telle que le listener de Home l'a reçue du serveur, sans réseau.
async function findCachedTask(ref: DocumentReference, taskUid: string): Promise<any | null> {
  try {
    const snapshot = await getDocFromCache(ref);
    if (!snapshot.exists()) return null;
    return (snapshot.data().tasks || []).find((task: any) => task.uid === taskUid) ?? null;
  } catch {
    return null;
  }
}

// Chemin principal : arrayRemove / arrayUnion à partir de la copie en cache. Le SDK applique
// ces écritures localement tout de suite (Home se met à jour sans attendre le serveur), et
// n'envoie que la tâche concernée. Une transaction, elle, contourne le cache local : Home
// resterait sur l'ancienne version jusqu'à ce que le serveur renvoie la fiche entière.
//
// arrayRemove compare la tâche champ par champ. Si l'autre parent a touché CETTE tâche
// juste avant et que le cache ne l'a pas encore reçu :
//  - il l'a modifiée, on la supprime : rien n'est retiré, la tâche réapparaît ;
//  - il l'a modifiée, on la modifie : les deux versions coexistent (doublon à supprimer) ;
//  - il l'a supprimée, on la modifie : notre version la fait revenir.
// Accepté : il faut deux personnes sur la même tâche dans la même seconde.
//
// Repli : tâche absente du cache (écran ouvert sans passer par Home) → transaction.
async function rewriteTasksInTransaction(
  ref: DocumentReference,
  taskUid: string,
  rewrite: (tasks: any[]) => any[],
): Promise<EditTaskResult> {
  const committed = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return 'babyNotFound' as const;
    const tasks: any[] = snapshot.data().tasks || [];
    if (!tasks.some((task) => task.uid === taskUid)) return 'taskNotFound' as const;
    transaction.update(ref, { tasks: rewrite(tasks) });
    return 'saved' as const;
  });
  // Une transaction non validée n'écrit rien ; si elle aboutit après le délai, rejouer la
  // même modification ou suppression est sans effet.
  return withTimeout(committed, 'timeout', 'Late task transaction failed');
}

// `transform` peut être rejoué par la transaction : il doit rester pur.
export async function updateBabyTask(
  babyID: string,
  taskUid: string,
  transform: (task: any) => any,
): Promise<EditTaskResult> {
  const ref = await getBabyDocRef(babyID);
  if (!ref) return 'babyNotFound';

  const cached = await findCachedTask(ref, taskUid);
  if (!cached) {
    return rewriteTasksInTransaction(ref, taskUid, (tasks) =>
      tasks.map((task) => (task.uid === taskUid ? transform(task) : task)),
    );
  }

  // arrayRemove et arrayUnion ne peuvent pas viser le même champ dans un seul update :
  // deux écritures dans un lot, appliquées dans l'ordre et atomiquement.
  const batch = writeBatch(db);
  batch.update(ref, { tasks: arrayRemove(cached) });
  batch.update(ref, { tasks: arrayUnion(transform(cached)) });
  const committed = batch.commit().then(() => 'saved' as const);
  return withTimeout(committed, 'queued', 'Queued task update failed');
}

export async function removeBabyTask(babyID: string, taskUid: string): Promise<EditTaskResult> {
  const ref = await getBabyDocRef(babyID);
  if (!ref) return 'babyNotFound';

  const cached = await findCachedTask(ref, taskUid);
  if (!cached) {
    return rewriteTasksInTransaction(ref, taskUid, (tasks) => tasks.filter((task) => task.uid !== taskUid));
  }

  const committed = updateDoc(ref, { tasks: arrayRemove(cached) }).then(() => 'saved' as const);
  return withTimeout(committed, 'queued', 'Queued task removal failed');
}

// Réservé aux tests.
export function __resetBabyDocRefCache(): void {
  docRefByBabyID.clear();
}
