import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface ModalSentimentGateProps {
  visible: boolean;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
}

const ModalSentimentGate: React.FC<ModalSentimentGateProps> = ({ visible, onClose, onYes, onNo }) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>

          <Text style={styles.question}>{t('review.sentimentQuestion')}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.noBtn} onPress={onNo}>
              <Text style={styles.noBtnText}>{t('review.no')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.yesBtn} onPress={onYes}>
              <Text style={styles.yesBtnText}>{t('review.yes')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FDF1E7',
    borderRadius: 18,
    padding: 24,
    width: '78%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  noBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E8D5C4',
    alignItems: 'center',
  },
  noBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  yesBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#C75B4A',
    alignItems: 'center',
  },
  yesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ModalSentimentGate;
