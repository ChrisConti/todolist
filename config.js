// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth, initializeAuth, getReactNativePersistence} from 'firebase/auth';
import {collection, initializeFirestore} from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjwNuanIruLkOpUnVZUAtBadt9t5exZyM",
  authDomain: "babylist-ae85f.firebaseapp.com",
  projectId: "babylist-ae85f",
  storageBucket: "babylist-ae85f.appspot.com",
  messagingSenderId: "347055639005",
  appId: "1:347055639005:web:195f3c79ffaef52133ce34",
  measurementId: "G-JZSVSH6SJ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
//export const auth = getAuth();
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = initializeFirestore(app, { experimentalForceLongPolling: true});
export const userRef = collection(db, 'Users');
export const taskRef = collection(db, 'Tasks');
export const babiesRef = collection(db, 'Baby');
//console.log(userRef)