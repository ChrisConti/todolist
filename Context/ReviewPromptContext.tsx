import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import ModalReviewPrompt from '../components/ModalReviewPrompt';
import ModalSentimentGate from '../components/ModalSentimentGate';
import analytics from '../services/analytics';
import { log } from '../utils/logger';
import { AuthentificationUserContext } from './AuthentificationContext';

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
  const [lastPromptAtCount, setLastPromptAtCount] = useState(0);
  const [promptCount, setPromptCount] = useState(0);

  useEffect(() => {
    if (user?.uid) {
      loadReviewState();
    } else {
      setTaskCount(0);
      setHasReviewed(false);
      setLastPromptAtCount(0);
    }
  }, [user?.uid]);

  const loadReviewState = async () => {
    if (!user?.uid) return;

    try {
      const countStr = await AsyncStorage.getItem(`task_created_count_${user.uid}`);
      const reviewedStr = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
      const lastPromptStr = await AsyncStorage.getItem(`last_review_prompt_at_count_${user.uid}`);
      const promptCountStr = await AsyncStorage.getItem(`review_prompt_count_${user.uid}`);

      // Migration depuis les anciennes clés globales
      const oldGlobalPromptedStr = await AsyncStorage.getItem('has_prompted_for_review');
      const oldGlobalCountStr = await AsyncStorage.getItem('task_created_count');

      setTaskCount(countStr ? parseInt(countStr, 10) : 0);
      setPromptCount(promptCountStr ? parseInt(promptCountStr, 10) : 0);

      if (oldGlobalPromptedStr === 'true' && !lastPromptStr && oldGlobalCountStr) {
        const currentCount = parseInt(oldGlobalCountStr, 10);
        setLastPromptAtCount(currentCount);
        await AsyncStorage.setItem(`last_review_prompt_at_count_${user.uid}`, currentCount.toString());
        if (!countStr) {
          setTaskCount(currentCount);
          await AsyncStorage.setItem(`task_created_count_${user.uid}`, currentCount.toString());
        }
        log.info(`Migrated old review prompt state for user ${user.uid}`, 'ReviewPromptContext');
      } else {
        setLastPromptAtCount(lastPromptStr ? parseInt(lastPromptStr, 10) : 0);
      }

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

      // Max 3 prompts pour rester dans les quotas Apple/Google
      if (promptCount >= 3) return;

      const shouldPrompt =
        (newCount >= 3 && lastPromptAtCount === 0) ||
        (newCount - lastPromptAtCount >= 25);

      if (shouldPrompt) {
        const newPromptCount = promptCount + 1;
        setShowSentimentModal(true);
        setLastPromptAtCount(newCount);
        setPromptCount(newPromptCount);
        await AsyncStorage.setItem(`last_review_prompt_at_count_${user.uid}`, newCount.toString());
        await AsyncStorage.setItem(`review_prompt_count_${user.uid}`, newPromptCount.toString());

        analytics.logEvent('review_prompt_shown', {
          task_count: newCount,
          prompt_number: newPromptCount,
          prompts_remaining: 3 - newPromptCount,
        });
      }
    } catch (error) {
      log.error('Failed to handle task creation', 'ReviewPromptContext', error);
    }
  }, [taskCount, hasReviewed, lastPromptAtCount, promptCount, user?.uid]);

  const handleSentimentYes = useCallback(async () => {
    if (!user?.uid) return;
    setShowSentimentModal(false);

    analytics.logEvent('review_sentiment_yes');

    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
      } else {
        // Fallback : ouvrir le store directement
        const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
        await Linking.openURL(url);
      }
    } catch (error) {
      log.error('Failed to request store review', 'ReviewPromptContext', error);
    }

  }, [user?.uid]);

  const handleSentimentNo = useCallback(async () => {
    setShowSentimentModal(false);
    analytics.logEvent('review_sentiment_no');

    const email = 'support@tribubaby.com';
    const subject = 'Feedback Tribu Baby';
    const body = 'Bonjour, voici ce que je changerais...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {});
  }, []);

  const handleSentimentClose = useCallback(() => {
    setShowSentimentModal(false);
    analytics.logEvent('review_sentiment_dismissed');
  }, []);

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
