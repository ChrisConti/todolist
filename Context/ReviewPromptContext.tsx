import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import ModalReviewPrompt from '../components/ModalReviewPrompt';
import analytics from '../services/analytics';
import { log } from '../utils/logger';
import { AuthentificationUserContext } from './AuthentificationContext';

interface ReviewPromptContextType {
  handleTaskCreated: () => Promise<void>;
  showReviewModalManually: () => void;
  hasReviewed: boolean;
}

const ReviewPromptContext = createContext<ReviewPromptContextType | undefined>(undefined);

export const ReviewPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useContext(AuthentificationUserContext);
  const user = authContext?.user || null;
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [lastPromptAtCount, setLastPromptAtCount] = useState(0);
  const [promptCount, setPromptCount] = useState(0);

  // Charger l'état au montage ET quand user change
  useEffect(() => {
    if (user?.uid) {
      loadReviewState();
    } else {
      // Pas d'utilisateur, reset à 0
      setTaskCount(0);
      setHasReviewed(false);
      setLastPromptAtCount(0);
    }
  }, [user?.uid]);

  const loadReviewState = async () => {
    if (!user?.uid) return;
    
    try {
      // Utiliser des clés préfixées par userId pour isoler les compteurs par utilisateur
      const countStr = await AsyncStorage.getItem(`task_created_count_${user.uid}`);
      const reviewedStr = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
      const lastPromptStr = await AsyncStorage.getItem(`last_review_prompt_at_count_${user.uid}`);
      const promptCountStr = await AsyncStorage.getItem(`review_prompt_count_${user.uid}`);
      
      // Migration : lire l'ancienne clé GLOBALE si elle existe
      const oldGlobalPromptedStr = await AsyncStorage.getItem('has_prompted_for_review');
      const oldGlobalCountStr = await AsyncStorage.getItem('task_created_count');
      
      setTaskCount(countStr ? parseInt(countStr, 10) : 0);
      setPromptCount(promptCountStr ? parseInt(promptCountStr, 10) : 0);
      
      // Migration depuis les anciennes clés globales
      if (oldGlobalPromptedStr === 'true' && !lastPromptStr && oldGlobalCountStr) {
        const currentCount = parseInt(oldGlobalCountStr, 10);
        setLastPromptAtCount(currentCount);
        await AsyncStorage.setItem(`last_review_prompt_at_count_${user.uid}`, currentCount.toString());
        
        // Migrer aussi le compteur
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

      log.debug(`Task created count for user ${user.uid}: ${newCount}`, 'ReviewPromptContext');

      // Si l'utilisateur a déjà reviewé, ne plus jamais demander
      if (hasReviewed) {
        return;
      }

      // Limite de 5 prompts max pour ne pas harceler
      if (promptCount >= 5) {
        log.debug('Max prompt count reached (5), stopping prompts', 'ReviewPromptContext');
        return;
      }

      // Première demande après 3 tâches, puis toutes les 25 tâches
      const shouldPrompt = 
        (newCount >= 3 && lastPromptAtCount === 0) || // Premier prompt à 3 tâches
        (newCount - lastPromptAtCount >= 25); // Re-prompt toutes les 25 tâches
      
      if (shouldPrompt) {
        const newPromptCount = promptCount + 1;
        log.info(`Showing review prompt modal (prompt #${newPromptCount})`, 'ReviewPromptContext');
        setShowReviewModal(true);
        setLastPromptAtCount(newCount);
        setPromptCount(newPromptCount);
        await AsyncStorage.setItem(`last_review_prompt_at_count_${user.uid}`, newCount.toString());
        await AsyncStorage.setItem(`review_prompt_count_${user.uid}`, newPromptCount.toString());
        
        analytics.logEvent('review_prompt_shown', {
          taskCount: newCount,
          promptNumber: newPromptCount,
          promptsRemaining: 5 - newPromptCount,
        });
      }
    } catch (error) {
      log.error('Failed to handle task creation', 'ReviewPromptContext', error);
    }
  }, [taskCount, hasReviewed, lastPromptAtCount, user?.uid]);

  const handleRate = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const appStoreUrl = 'https://apps.apple.com/app/id6740452792?action=write-review';
      
      // Vérifier si on peut ouvrir l'URL avant de continuer
      const canOpen = await Linking.canOpenURL(appStoreUrl);
      
      if (!canOpen) {
        log.warn('Cannot open App Store URL', 'ReviewPromptContext');
        setShowReviewModal(false);
        return;
      }
      
      analytics.logEvent('review_write_clicked');
      await Linking.openURL(appStoreUrl);
      
      // Marquer définitivement que l'utilisateur a reviewé (uniquement si ouverture réussie)
      await AsyncStorage.setItem(`has_reviewed_app_${user.uid}`, 'true');
      setHasReviewed(true);
      setShowReviewModal(false);
      
      log.info('User clicked to write review', 'ReviewPromptContext');
    } catch (error) {
      log.error('Failed to open App Store', 'ReviewPromptContext', error);
      setShowReviewModal(false);
    }
  }, [user?.uid]);

  const handleClose = useCallback(async () => {
    try {
      setShowReviewModal(false);
      
      // Ne PAS marquer comme reviewé, juste fermer la modal
      // La modal réapparaîtra dans 25 tâches
      analytics.logEvent('review_prompt_dismissed');
      log.debug('Review prompt dismissed - will show again in 25 tasks', 'ReviewPromptContext');
    } catch (error) {
      log.error('Failed to handle review close', 'ReviewPromptContext', error);
    }
  }, []);

  const showReviewModalManually = useCallback(() => {
    // Vérifier si l'utilisateur n'a pas déjà reviewé
    if (!hasReviewed) {
      setShowReviewModal(true);
      analytics.logEvent('review_modal_opened_manually', {
        userId: user?.uid,
        taskCount,
      });
      log.info('Review modal opened manually from Settings', 'ReviewPromptContext');
    } else {
      log.info('User already reviewed - modal not shown', 'ReviewPromptContext');
    }
  }, [hasReviewed, user?.uid, taskCount]);

  return (
    <ReviewPromptContext.Provider value={{ 
      handleTaskCreated, 
      showReviewModalManually,
      hasReviewed
    }}>
      {children}
      <ModalReviewPrompt
        visible={showReviewModal}
        onClose={handleClose}
        onRate={handleRate}
      />
    </ReviewPromptContext.Provider>
  );
};

export const useReviewPrompt = (): ReviewPromptContextType => {
  console.log('[ReviewPromptContext] useReviewPrompt called');
  const context = useContext(ReviewPromptContext);
  console.log('[ReviewPromptContext] context value:', context);
  
  if (!context) {
    console.warn('[ReviewPromptContext] Context is undefined, returning fallback');
    // Au lieu de lancer une erreur, retourner des fonctions no-op
    // Cela évite le crash si le contexte n'est pas encore monté
    const fallback: ReviewPromptContextType = {
      handleTaskCreated: async () => {
        console.warn('[ReviewPromptContext] handleTaskCreated called but Provider not mounted');
      },
      showReviewModalManually: () => {
        console.warn('[ReviewPromptContext] showReviewModalManually called but Provider not mounted');
      },
      hasReviewed: false,
    };
    console.log('[ReviewPromptContext] Returning fallback:', fallback);
    return fallback;
  }
  console.log('[ReviewPromptContext] Returning context');
  return context;
};
