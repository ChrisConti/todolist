import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useCallback } from 'react';
import ModalReviewPrompt from '../components/ModalReviewPrompt';
import { Analytics } from '../services/analytics';

// Hook à utiliser dans CreateTask
export function useReviewPrompt() {
  const [showReviewModal, setShowReviewModal] = useState(false);

  // À appeler après chaque création de tâche
  const [modalLocked, setModalLocked] = useState(false);
  const handleTaskCreated = useCallback(async () => {
    const countStr = await AsyncStorage.getItem('task_created_count');
    const count = countStr ? parseInt(countStr, 10) : 0;
    const newCount = count + 1;
    await AsyncStorage.setItem('task_created_count', newCount.toString());

    const hasPrompted = await AsyncStorage.getItem('has_prompted_for_review');
    if (newCount >= 3 && hasPrompted !== 'true') {
      setShowReviewModal(true);
      setModalLocked(true);
    }
  }, []);

  // À appeler quand l'utilisateur clique sur "Noter"
  const handleRate = useCallback(async () => {
    setShowReviewModal(false);
    setModalLocked(false);
    // Log event for Firebase Analytics
    Analytics.logEvent('review_rate_clicked');
    // Redirige vers la page App Store de l'app
    Linking.openURL('https://apps.apple.com/app/id6740452792?action=write-review');
    await AsyncStorage.setItem('has_prompted_for_review', 'true');
  }, []);

  // À appeler quand l'utilisateur ferme la modale
  const handleClose = useCallback(() => {
    setShowReviewModal(false);
    setModalLocked(false);
  }, []);

  // À placer dans le render de CreateTask
  const ReviewModal = (
    <ModalReviewPrompt
      visible={showReviewModal}
      onClose={modalLocked ? handleClose : () => {}}
      onRate={modalLocked ? handleRate : () => {}}
    />
  );

  return { handleTaskCreated, ReviewModal };
}
