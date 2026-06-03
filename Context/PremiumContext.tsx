import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { useTranslation } from 'react-i18next';
import { AuthentificationUserContext } from './AuthentificationContext';
import { userRef } from '../config';
import { query, where, onSnapshot, getDocs, updateDoc } from 'firebase/firestore';
import { updateWidgetPremium } from '../utils/widgetBridge';
import Analytics from '../services/analytics';
import EarlyAdopterModal from '../components/EarlyAdopterModal';

const ENTITLEMENT_ID = 'Single Purchase';
const RC_API_KEY_IOS = 'appl_vQnfZpgKJPmMvOuZHyODGWaKOYT';
const RC_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';

// Tous les comptes créés avant cette date sont early adopters → premium offert
const PREMIUM_LAUNCH_DATE = new Date('2026-05-15');

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchaseError: string | null;
  priceString: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  isLoading: true,
  purchaseError: null,
  priceString: null,
  purchase: async () => false,
  restore: async () => {},
});

export const usePremium = () => useContext(PremiumContext);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useContext(AuthentificationUserContext);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [isEarlyAdopter, setIsEarlyAdopter] = useState(false);
  const [showEarlyAdopterWelcome, setShowEarlyAdopterWelcome] = useState(false);

  useEffect(() => {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID });
    fetchPrice();
  }, []);

  // User doc : source de vérité unique
  useEffect(() => {
    if (!user?.uid) {
      setIsPremium(false);
      setIsEarlyAdopter(false);
      setShowEarlyAdopterWelcome(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const q = query(userRef, where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const purchased = data.isPremium === true;
        const creationDate: Date = data.creationDate?.toDate?.() ?? new Date();
        const earlyAdopter = creationDate < PREMIUM_LAUNCH_DATE;
        const active = purchased || earlyAdopter;
        setIsEarlyAdopter(earlyAdopter);
        setIsPremium(active);
        updateWidgetPremium(active);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [user?.uid]);

  // Affiche la modale early adopter une seule fois
  useEffect(() => {
    if (!isEarlyAdopter || !user?.uid) return;
    const key = `@earlyAdopterWelcomeSeen_${user.uid}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (!seen) {
        setShowEarlyAdopterWelcome(true);
        Analytics.logEvent('early_adopter_modal_shown');
      }
    });
  }, [isEarlyAdopter, user?.uid]);

  const fetchPrice = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (pkg) {
        const price = pkg.product.priceString;
        // Ignore bare currency codes (e.g. "USD") returned by StoreKit when territory is misconfigured
        if (price && price.length > 5) setPriceString(price);
      }
    } catch {
      // non-critical
    }
  };

  const grantPremium = async (uid: string) => {
    const snap = await getDocs(query(userRef, where('userId', '==', uid)));
    if (!snap.empty) await updateDoc(snap.docs[0].ref, { isPremium: true });
  };

  const purchase = async (): Promise<boolean> => {
    if (!user?.uid) return false;
    setPurchaseError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) throw new Error('No package available');

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await grantPremium(user.uid);
        Analytics.logEvent('purchase_success', { price: pkg.product.priceString });
        return true;
      }
      Analytics.logEvent('purchase_failed', { reason: 'entitlement_not_active' });
      return false;
    } catch (e: any) {
      if (!e.userCancelled) {
        setPurchaseError(t('premium.purchaseError'));
        Analytics.logEvent('purchase_failed', { reason: e?.message ?? 'unknown' });
      } else {
        Analytics.logEvent('purchase_cancelled');
      }
      return false;
    }
  };

  const restore = async () => {
    if (!user?.uid) return;
    setPurchaseError(null);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await grantPremium(user.uid);
        Analytics.logEvent('restore_success');
        Alert.alert('', t('premium.restoreSuccess'));
      } else {
        Analytics.logEvent('restore_failed', { reason: 'no_entitlement' });
        setPurchaseError(t('premium.restoreError'));
      }
    } catch {
      Analytics.logEvent('restore_failed', { reason: 'error' });
      setPurchaseError(t('premium.restoreError'));
    }
  };

  const dismissEarlyAdopterWelcome = () => {
    if (user?.uid) AsyncStorage.setItem(`@earlyAdopterWelcomeSeen_${user.uid}`, 'true');
    Analytics.logEvent('early_adopter_modal_dismissed');
    setShowEarlyAdopterWelcome(false);
  };

  return (
    <PremiumContext.Provider value={{ isPremium, isLoading, purchaseError, priceString, purchase, restore }}>
      {children}
      <EarlyAdopterModal visible={showEarlyAdopterWelcome} onDismiss={dismissEarlyAdopterWelcome} />
    </PremiumContext.Provider>
  );
};
