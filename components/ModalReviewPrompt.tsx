import React from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('review.title', 'Merci d’utiliser l’app !')}</Text>
          <Text style={styles.text}>{t('review.text', 'Tu aimes l’application ? Note-nous sur le store !')}</Text>
          <View style={styles.buttons}>
            <Button title={t('review.later', 'Plus tard')} onPress={onClose} />
            <Button title={t('review.rate', 'Noter')} onPress={onRate} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#fff', borderRadius: 10, padding: 24, width: 300, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  text: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
});

export default ModalReviewPrompt;
