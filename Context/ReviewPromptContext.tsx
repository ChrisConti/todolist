import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import ModalReviewPrompt from '../components/ModalReviewPrompt';
import ModalSentimentGate from '../components/ModalSentimentGate';
import analytics from '../services/analytics';
import { log } from '../utils/logger';
import { AuthentificationUserContext } from './AuthentificationContext';
import {
  ReviewPromptState,
  initialReviewPromptState,
  migrateLegacyState,
  parseReviewPromptState,
  shouldShowPrompt,
  recordPromptShown,
  recordOutcome,
  consumedInWindow,
  MAX_CONSUMED_PER_YEAR,
} from '../utils/reviewPromptLogic';

interface ReviewPromptContextType {
  handleTaskCreated: () => Promise<void>;
  showReviewModalManually: () => void;
  hasReviewed: boolean;
}

const ReviewPromptContext = createContext<ReviewPromptContextType | undefined>(undefined);

const APP_STORE_URL = 'https://apps.apple.com/app/id6740452792?action=write-review';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tribubaby.tribubaby';

export const ReviewPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthentificationUserContext);
  const user = authContext?.user || null;

  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const promptState = useRef<ReviewPromptState>(initialReviewPromptState());

  useEffect(() => {
    if (user?.uid) {
      loadReviewState();
    } else {
      setTaskCount(0);
      setHasReviewed(false);
      promptState.current = initialReviewPromptState();
    }
  }, [user?.uid]);

  const persistPromptState = async (uid: string) => {
    await AsyncStorage.setItem(`review_prompt_state_${uid}`, JSON.stringify(promptState.current));
  };

  const loadReviewState = async () => {
    if (!user?.uid) return;

    try {
      const countStr = await AsyncStorage.getItem(`task_created_count_${user.uid}`);
      const reviewedStr = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
      const stateStr = await AsyncStorage.getItem(`review_prompt_state_${user.uid}`);

      let count = countStr ? parseInt(countStr, 10) : 0;
      const parsed = parseReviewPromptState(stateStr);

      if (parsed) {
        promptState.current = parsed;
      } else {
        // Migration depuis l'ancien système (compteur à vie) et les clés globales historiques
        const legacyLastPromptStr = await AsyncStorage.getItem(`last_review_prompt_at_count_${user.uid}`);
        const oldGlobalPromptedStr = await AsyncStorage.getItem('has_prompted_for_review');
        const oldGlobalCountStr = await AsyncStorage.getItem('task_created_count');

        let legacyLastPromptAtCount = legacyLastPromptStr ? parseInt(legacyLastPromptStr, 10) : 0;

        if (oldGlobalPromptedStr === 'true' && !legacyLastPromptStr && oldGlobalCountStr) {
          legacyLastPromptAtCount = parseInt(oldGlobalCountStr, 10);
          if (!countStr) {
            count = legacyLastPromptAtCount;
            await AsyncStorage.setItem(`task_created_count_${user.uid}`, count.toString());
          }
        }

        promptState.current = migrateLegacyState(legacyLastPromptAtCount);
        await persistPromptState(user.uid);
        if (legacyLastPromptAtCount > 0) {
          log.info(`Migrated legacy review prompt state for user ${user.uid}`, 'ReviewPromptContext');
        }
      }

      setTaskCount(count);
      setHasReviewed(reviewedStr === 'true');
    } catch (error) {
      log.error('Failed to load review state', 'ReviewPromptContext', error);
    }
  };

  const handleTaskCreated = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const newCount = taskCount + 1;
      setTaskCount(newCount);
      await AsyncStorage.setItem(`task_created_count_${user.uid}`, newCount.toString());

      if (hasReviewed) return;

      const now = Date.now();
      if (shouldShowPrompt(promptState.current, newCount, now)) {
        promptState.current = recordPromptShown(promptState.current, newCount, now);
        setShowSentimentModal(true);
        await persistPromptState(user.uid);

        analytics.logEvent('review_prompt_shown', {
          task_count: newCount,
          consumed_in_window: consumedInWindow(promptState.current, now),
          prompts_remaining: MAX_CONSUMED_PER_YEAR - consumedInWindow(promptState.current, now),
        });
      }
    } catch (error) {
      log.error('Failed to handle task creation', 'ReviewPromptContext', error);
    }
  }, [taskCount, hasReviewed, user?.uid]);

  const handleSentimentYes = useCallback(async () => {
    if (!user?.uid) return;
    setShowSentimentModal(false);

    analytics.logEvent('review_sentiment_yes');
    promptState.current = recordOutcome(promptState.current, 'yes', Date.now());
    persistPromptState(user.uid).catch(() => {});

    try {
      if (Platform.OS === 'ios') {
        await StoreReview.requestReview();
      } else {
        const available = await StoreReview.isAvailableAsync();
        if (available) {
          await StoreReview.requestReview();
        } else {
          const marketUrl = `market://details?id=com.tribubaby.tribubaby`;
          const canOpenMarket = await Linking.canOpenURL(marketUrl);
          await Linking.openURL(canOpenMarket ? marketUrl : PLAY_STORE_URL);
        }
      }
    } catch (error) {
      log.error('Failed to request store review', 'ReviewPromptContext', error);
    }

  }, [user?.uid]);

  const handleSentimentNo = useCallback(async () => {
    setShowSentimentModal(false);
    analytics.logEvent('review_sentiment_no');

    if (user?.uid) {
      promptState.current = recordOutcome(promptState.current, 'no', Date.now());
      persistPromptState(user.uid).catch(() => {});
    }

    const email = 'support@tribubaby.com';
    const subject = 'Feedback Tribu Baby';
    const body = 'Bonjour, voici ce que je changerais...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {});
  }, [user?.uid]);

  const handleSentimentClose = useCallback(() => {
    setShowSentimentModal(false);
    analytics.logEvent('review_sentiment_dismissed');

    if (user?.uid) {
      promptState.current = recordOutcome(promptState.current, 'dismissed', Date.now());
      persistPromptState(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  // Settings : ouvre la modal complète qui redirige vers le store
  const handleRate = useCallback(async () => {
    if (!user?.uid) return;

    try {
      let urlToOpen = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
      if (Platform.OS === 'android') {
        const marketUrl = `market://details?id=com.tribubaby.tribubaby`;
        const canOpenMarket = await Linking.canOpenURL(marketUrl);
        urlToOpen = canOpenMarket ? marketUrl : PLAY_STORE_URL;
      }

      analytics.logEvent('review_write_clicked', { platform: Platform.OS });
      await Linking.openURL(urlToOpen);

      await AsyncStorage.setItem(`has_reviewed_app_${user.uid}`, 'true');
      setHasReviewed(true);
      setShowReviewModal(false);
    } catch (error) {
      log.error('Failed to open store', 'ReviewPromptContext', error);
      setShowReviewModal(false);
    }
  }, [user?.uid]);

  const handleReviewClose = useCallback(() => {
    setShowReviewModal(false);
    analytics.logEvent('review_prompt_dismissed');
  }, []);

  const showReviewModalManually = useCallback(() => {
    setShowReviewModal(true);
  }, []);

  return (
    <ReviewPromptContext.Provider value={{ handleTaskCreated, showReviewModalManually, hasReviewed }}>
      {children}
      <ModalSentimentGate
        visible={showSentimentModal}
        onClose={handleSentimentClose}
        onYes={handleSentimentYes}
        onNo={handleSentimentNo}
      />
      <ModalReviewPrompt
        visible={showReviewModal}
        onClose={handleReviewClose}
        onRate={handleRate}
      />
    </ReviewPromptContext.Provider>
  );
};

export const useReviewPrompt = (): ReviewPromptContextType => {
  const context = useContext(ReviewPromptContext);
  if (!context) {
    return {
      handleTaskCreated: async () => {},
      showReviewModalManually: () => {},
      hasReviewed: false,
    };
  }
  return context;
};
