import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, collection, collectionGroup } from 'firebase/firestore';

/**
 * Second Firebase project: Suivi Contractions.
 * Own auth instance — the dashboard admin signs in separately on the Contractions tab
 * (session persisted in the browser like the main one).
 */
const contractionsConfig = {
  apiKey: import.meta.env.VITE_CONTRACTIONS_API_KEY,
  authDomain: import.meta.env.VITE_CONTRACTIONS_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_CONTRACTIONS_PROJECT_ID,
  storageBucket: import.meta.env.VITE_CONTRACTIONS_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_CONTRACTIONS_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_CONTRACTIONS_APP_ID,
};

export const contractionsApp = initializeApp(contractionsConfig, 'contractions');

export const contractionsAuth = getAuth(contractionsApp);
setPersistence(contractionsAuth, browserLocalPersistence);

export const contractionsDb = getFirestore(contractionsApp);

export const contractionsUsersRef = collection(contractionsDb, 'Users');
export const allContractionsRef = collectionGroup(contractionsDb, 'contractions');
