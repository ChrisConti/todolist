import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface ModalReviewPromptProps {
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
}

const ModalReviewPrompt: React.FC<ModalReviewPromptProps> = ({ visible, onClose, onRate }) => {
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
            <Ionicons name="heart" size={60} color="#C75B4A" />
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
              <Ionicons name="chatbox-ellipses" size={20} color="#fff" style={styles.buttonIcon} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FDF1E7',
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
    color: '#C75B4A',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Pacifico',
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  commentCTA: {
    fontSize: 15,
    color: '#C75B4A',
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
    backgroundColor: '#E8D5C4',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#C75B4A',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#C75B4A',
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
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ModalReviewPrompt;
