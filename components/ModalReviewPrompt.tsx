import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';

interface ModalReviewPromptProps {
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
}

const ModalReviewPrompt: React.FC<ModalReviewPromptProps> = ({ visible, onClose, onRate }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={60} color={theme.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t('review.title')}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {t('review.message')}
          </Text>

          {/* Strong CTA for comment */}
          <Text style={styles.commentCTA}>
            {t('review.commentCTA')}
          </Text>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.laterButton}
              onPress={onClose}
            >
              <Text style={styles.laterButtonText}>
                {t('review.later')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={onRate}
            >
              <Ionicons name="chatbox-ellipses" size={20} color={theme.onPrimary} style={styles.buttonIcon} />
              <Text style={styles.reviewButtonText}>
                {t('review.writeReview')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.background,
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.accent,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Pacifico',
  },
  message: {
    fontSize: 16,
    color: theme.text,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  commentCTA: {
    fontSize: 15,
    color: theme.accent,
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '600',
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.border,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    color: theme.onPrimary,
    fontWeight: 'bold',
  },
});

export default ModalReviewPrompt;
