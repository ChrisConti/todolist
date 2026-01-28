import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Clipboard, ToastAndroid, Platform, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Copy from './assets/copy.svg';
import { FontAwesome } from '@expo/vector-icons';
import analytics from './services/analytics';

interface BabyFamilyTabProps {
  babyID: string;
  usersList: Array<{
    userId: string;
    username: string;
    email: string;
    role?: string;
    roleAutre?: string;
  }>;
  currentUserId: string;
  adminId: string;
  onLeaveBaby: () => void;
}

const BabyFamilyTab: React.FC<BabyFamilyTabProps> = ({
  babyID,
  usersList,
  currentUserId,
  adminId,
  onLeaveBaby,
}) => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    
    analytics.logEvent('baby_code_copied', {
      baby_id: babyID,
      user_id: currentUserId,
    });
    
    // Utiliser ToastAndroid sur Android, toast personnalisé sur iOS
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('success.copied'), ToastAndroid.SHORT);
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Section Membres de la famille */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('baby.familyMembers')}</Text>
          {usersList.map((user) => (
            <View key={user.userId} style={styles.userCard}>
              <View style={styles.userInfo}>
                <FontAwesome name="user-circle" size={24} color="#C75B4A" />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.username}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              {currentUserId === adminId && user.userId !== adminId && (
                <TouchableOpacity>
                  <FontAwesome name="times-circle" size={20} color="#C75B4A" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Section Partager le bébé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('baby.shareBaby')}</Text>
          <Text style={styles.shareDescription}>{t('baby.shareMessage')}</Text>
          
          <TouchableOpacity 
            style={styles.copyCodeButton}
            onPress={() => copyToClipboard(babyID)}
          >
            <Text style={styles.copyCodeText}>{t('baby.copyCode')}</Text>
            <Copy height={20} width={20} />
          </TouchableOpacity>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Code:</Text>
            <Text style={styles.codeValue}>{babyID}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer avec bouton Quitter */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.leaveButton} onPress={onLeaveBaby}>
          <Text style={styles.leaveButtonText}>{t('baby.leaveBaby')}</Text>
        </TouchableOpacity>
      </View>

      {/* Toast personnalisé pour iOS */}
      {showToast && (
        <View style={styles.customToast}>
          <View style={styles.customToastContent}>
            <Text style={styles.customToastText}>{t('success.copied')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#7A8889',
    marginTop: 2,
  },
  userRole: {
    fontSize: 13,
    color: '#C75B4A',
    marginTop: 2,
    fontStyle: 'italic',
  },
  shareDescription: {
    fontSize: 14,
    color: '#7A8889',
    marginBottom: 15,
    lineHeight: 20,
  },
  copyCodeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
  },
  copyCodeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  codeContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A8889',
  },
  codeValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FDF1E7',
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customToast: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  customToastContent: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customToastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BabyFamilyTab;
