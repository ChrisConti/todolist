import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import React, { useContext, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ItemParameter from './ItemParameter.js';
import { auth } from './config.js';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import { useReviewPrompt } from './Context/ReviewPromptContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Settings = ({ navigation }) => {
  const { user, setUser, babyID, setBabyID, setUserInfo, userInfo } = useContext(AuthentificationUserContext);
  const { showReviewModalManually } = useReviewPrompt();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const provider = userInfo?.provider || 'email';

  useEffect(() => {
    analytics.logScreenView('Settings');
  }, []);

  const handleSignOut = () => {
    analytics.logEvent('sign_out', { provider });
    signOut(auth)
      .then(() => {
        setUser(null);
        setBabyID(null);
        setUserInfo(null);
      })
      .catch((error) => {
        Alert.alert(error.message);
      });
  };

  const handleContactUs = () => {
    const email = "support@tribubaby.com";
    const subject = 'Contact Tribu baby';
    const body = 'Hi there, I would like to...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err));
  };

  const handleFeedback = () => {
    const email = "support@tribubaby.com";
    const subject = 'Feedback';
    const body = 'Hi, I would like to suggest...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err));
  };


  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{t('title.settings') || 'Réglages'}</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View>
          <View>
            <Text style={styles.titleParameter}>{t('settings.personalOptions')}</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'change_name' }); navigation.navigate('ChangeName'); }}>
              <ItemParameter title={t('settings.myName')} icon="account-edit" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'change_email' }); navigation.navigate('ChangeEmail'); }}>
              <ItemParameter title={t('settings.myEmail')} icon="email-edit" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            {provider === 'email' && (
              <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'change_password' }); navigation.navigate('ChangePassword'); }}>
                <ItemParameter title={t('settings.myPassword')} icon="lock-reset" iconFamily="MaterialCommunityIcons" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                analytics.logEvent('settings_item_tapped', { item: 'delete_account' });
                navigation.navigate('DeleteAccount');
              }}
            >
              <ItemParameter title={t('settings.deleteAccount')} icon="account-remove" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'email_opt_in' }); navigation.navigate('EmailOptIn'); }}>
              <ItemParameter title={t('settings.emailOptIn')} icon="email-newsletter" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <ItemParameter title={t('settings.signOut')} icon="logout" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <View>
            <Text style={styles.titleParameter}>{t('settings.about')}</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'rate_app' }); showReviewModalManually(); }}>
              <ItemParameter
                title={t('settings.rateApp')}
                icon="star"
                iconFamily="MaterialCommunityIcons"
                backgroundColor="#C75B4A"
                iconColor="#FFD700"
                textColor="white"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'feedback' }); handleFeedback(); }}>
              <ItemParameter
                title={t('settings.feedback')}
                icon="lightbulb-on"
                iconFamily="MaterialCommunityIcons"
                backgroundColor="#C75B4A"
                iconColor="#FFD700"
                textColor="white"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'privacy_policy' }); navigation.navigate('PrivacyPolicy'); }}>
              <ItemParameter title={t('settings.privacyPolicy')} icon="shield-lock" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'terms_of_use' }); navigation.navigate('TermsOfUse'); }}>
              <ItemParameter title={t('settings.termsOfUse')} icon="file-document" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'contact_us' }); handleContactUs(); }}>
              <ItemParameter title={t('settings.contactUs')} icon="email" iconFamily="MaterialCommunityIcons" />
            </TouchableOpacity>

          </View>

        </View>
      </ScrollView>
    </View>
  );
}

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#C75B4A',
  },
  headerTitle: {
    fontSize: 22,
    color: '#F6F0EB',
    fontFamily: 'Pacifico',
    textAlign: 'center',
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#C75B4A', borderRadius: 14, padding: 16, marginBottom: 4,
  },
  premiumBannerLeft: { flex: 1 },
  premiumBannerTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  premiumBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  premiumActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF3CD', borderRadius: 14, padding: 14, marginBottom: 4,
  },
  premiumActiveText: { fontSize: 14, fontWeight: '700', color: '#C75B4A' },
});



