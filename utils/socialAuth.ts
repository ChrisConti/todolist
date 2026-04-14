import { Platform, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Localization from 'expo-localization';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth, db } from '../config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { log } from './logger';
import i18next from 'i18next';

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
    const userInfo = await GoogleSignin.signIn();
    log.info(`Google Sign-In response: ${JSON.stringify(userInfo)}`, 'socialAuth');

    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

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
        emailOptIn: false,
        country: Localization.region || 'Unknown',
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
        let providerName = i18next.t('socialAuth.otherMethod') || 'unknown';

        if (methods.includes('password')) providerName = 'Email/Password';
        else if (methods.includes('apple.com')) providerName = 'Apple';

        Alert.alert(
          i18next.t('socialAuth.existingAccountTitle'),
          i18next.t('socialAuth.existingAccountMessage', { provider: providerName }),
          [{ text: i18next.t('socialAuth.ok') }]
        );
      }
    } else {
      Alert.alert(
        i18next.t('socialAuth.connectionErrorTitle'),
        i18next.t('socialAuth.googleConnectionError'),
        [{ text: i18next.t('socialAuth.ok') }]
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
        i18next.t('socialAuth.appleNotAvailableTitle'),
        i18next.t('socialAuth.appleNotAvailableMessage'),
        [{ text: i18next.t('socialAuth.ok') }]
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
    if (!identityToken) {
      throw new Error('No identity token received from Apple');
    }
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
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
        email: user.email || '', // Email only provided on first Apple sign-in
        username: displayName,
        creationDate: serverTimestamp(),
        provider: 'apple',
        emailOptIn: false,
        country: Localization.region || 'Unknown',
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
        let providerName = i18next.t('socialAuth.otherMethod') || 'unknown';

        if (methods.includes('password')) providerName = 'Email/Password';
        else if (methods.includes('google.com')) providerName = 'Google';

        Alert.alert(
          i18next.t('socialAuth.existingAccountTitle'),
          i18next.t('socialAuth.existingAccountMessage', { provider: providerName }),
          [{ text: i18next.t('socialAuth.ok') }]
        );
      }
    } else {
      Alert.alert(
        i18next.t('socialAuth.connectionErrorTitle'),
        i18next.t('socialAuth.appleConnectionError'),
        [{ text: i18next.t('socialAuth.ok') }]
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
