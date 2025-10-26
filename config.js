import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { collection, initializeFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjwNuanIruLkOpUnVZUAtBadt9t5exZyM",
  authDomain: "babylist-ae85f.firebaseapp.com",
  projectId: "babylist-ae85f",
  storageBucket: "babylist-ae85f.appspot.com",
  messagingSenderId: "347055639005",
  appId: "1:347055639005:web:195f3c79ffaef52133ce34",
  measurementId: "G-JZSVSH6SJ9",
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const userRef = collection(db, "Users");
export const babiesRef = collection(db, "Baby");