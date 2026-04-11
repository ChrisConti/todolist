import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config';
import { log } from './logger';

const FIRST_OPEN_KEY = '@tribubaby_first_open_tracked';

/**
 * Track first app open in Firestore
 * This function is called once per installation to record download stats
 */
export const trackFirstOpen = async () => {
  try {
    // Check if already tracked
    const alreadyTracked = await AsyncStorage.getItem(FIRST_OPEN_KEY);

    if (alreadyTracked === 'true') {
      log.debug('First open already tracked, skipping', 'firstOpenTracker');
      return;
    }

    // Requires an authenticated user due to Firestore rules
    if (!auth.currentUser) {
      log.debug('User not authenticated, deferring first open tracking', 'firstOpenTracker');
      return;
    }

    // Record first open in Firestore
    const firstOpensRef = collection(db, 'AppInstalls');
    await addDoc(firstOpensRef, {
      platform: Platform.OS, // 'ios' or 'android'
      timestamp: serverTimestamp(),
      version: Platform.Version,
    });

    // Mark as tracked
    await AsyncStorage.setItem(FIRST_OPEN_KEY, 'true');
    log.info(`First open tracked: ${Platform.OS}`, 'firstOpenTracker');
  } catch (error) {
    log.error('Failed to track first open', 'firstOpenTracker', error);
    // Don't throw - this is not critical for app functionality
  }
};
