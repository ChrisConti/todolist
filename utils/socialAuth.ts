import { Platform, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth, db } from '../config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { log } from './logger';

/**
 * Configure Google Sign-In
 * Must be called once at app startup
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Will set in .env
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    log.info('Starting Google Sign-In', 'socialAuth');

    // Check if device supports Google Play Services (Android)
    await GoogleSignin.hasPlayServices();

    // Get user info from Google
    const { idToken } = await GoogleSignin.signIn();

    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    log.info(`Google Sign-In successful: ${user.uid}`, 'socialAuth');

    // Check if user document exists in Firestore
    const userDocRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create user document
      await setDoc(userDocRef, {
        userId: user.uid,
        email: user.email || '',
        username: user.displayName || 'Utilisateur Google',
        creationDate: serverTimestamp(),
        provider: 'google',
        photoURL: user.photoURL,
      });
      log.info('User document created in Firestore', 'socialAuth');
    }

    return user;
  } catch (error: any) {
    log.error('Google Sign-In error', 'socialAuth', error);

    // Handle account exists with different credential
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      if (email) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        let providerName = 'une autre méthode';

        if (methods.includes('password')) providerName = 'Email/Password';
        else if (methods.includes('apple.com')) providerName = 'Apple';

        Alert.alert(
          'Compte existant',
          `Un compte existe déjà avec cet email.\nVeuillez vous connecter avec: ${providerName}`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Erreur de connexion',
        'Impossible de se connecter avec Google. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }

    throw error;
  }
};

/**
 * Sign in with Apple
 * iOS only
 */
export const signInWithApple = async () => {
  try {
    log.info('Starting Apple Sign-In', 'socialAuth');

    // Check if Apple Sign-In is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Non disponible',
        'La connexion avec Apple n\'est disponible que sur iOS 13+',
        [{ text: 'OK' }]
      );
      return;
    }

    // Request Apple authentication
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create Firebase credential
    const { identityToken, fullName } = appleCredential;
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken!,
    });

    // Sign in to Firebase
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    log.info(`Apple Sign-In successful: ${user.uid}`, 'socialAuth');

    // Check if user document exists
    const userDocRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // ⚠️ IMPORTANT: Email is only provided on FIRST sign-in
      const displayName = fullName?.givenName && fullName?.familyName
        ? `${fullName.givenName} ${fullName.familyName}`
        : (user.displayName || 'Utilisateur Apple');

      await setDoc(userDocRef, {
        userId: user.uid,
        email: user.email || 'no-email@apple.com', // Fallback if no email
        username: displayName,
        creationDate: serverTimestamp(),
        provider: 'apple',
      });
      log.info('User document created in Firestore', 'socialAuth');
    }

    return user;
  } catch (error: any) {
    log.error('Apple Sign-In error', 'socialAuth', error);

    // User cancelled
    if (error.code === 'ERR_CANCELED') {
      log.info('User cancelled Apple Sign-In', 'socialAuth');
      return;
    }

    // Handle account exists with different credential
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      if (email) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        let providerName = 'une autre méthode';

        if (methods.includes('password')) providerName = 'Email/Password';
        else if (methods.includes('google.com')) providerName = 'Google';

        Alert.alert(
          'Compte existant',
          `Un compte existe déjà avec cet email.\nVeuillez vous connecter avec: ${providerName}`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'Erreur de connexion',
        'Impossible de se connecter avec Apple. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }

    throw error;
  }
};

/**
 * Get provider name for display
 */
export const getProviderName = (providerId: string): string => {
  switch (providerId) {
    case 'google.com':
      return 'Google';
    case 'apple.com':
      return 'Apple';
    case 'password':
      return 'Email/Password';
    default:
      return 'Inconnu';
  }
};

/**
 * Get provider icon
 */
export const getProviderIcon = (providerId: string): string => {
  switch (providerId) {
    case 'google.com':
      return '🔵';
    case 'apple.com':
      return '🍎';
    case 'password':
      return '✉️';
    default:
      return '❓';
  }
};
