import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { collection, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { log } from './utils/logger';

log.info('Starting Firebase initialization...', 'config.js');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app;
try {
  log.debug('Initializing Firebase app...', 'config.js');
  app = initializeApp(firebaseConfig);
  log.info('Firebase app initialized successfully', 'config.js');
} catch (error) {
  log.error('Firebase initialization error', 'config.js', error);
  throw error;
}

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
log.info('Firebase Auth initialized', 'config.js');

export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
log.info('Firestore initialized', 'config.js');

export const storage = getStorage(app);
log.info('Firebase Storage initialized', 'config.js');

export const userRef = collection(db, "Users");
export const babiesRef = collection(db, "Baby");
log.info('Firebase config complete', 'config.js');