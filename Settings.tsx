import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking, Platform } from 'react-native';
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
import { usePremium } from './Context/PremiumContext';

const Settings = ({ navigation }) => {
  const { user, setUser, babyID, setBabyID, setUserInfo, userInfo } = useContext(AuthentificationUserContext);
  const { showReviewModalManually } = useReviewPrompt();
  const { isPremium } = usePremium();
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

        {/* Premium banner */}
        {isPremium ? (
          <TouchableOpacity
            style={styles.premiumActiveBadge}
            activeOpacity={0.85}
            onPress={() => {
              const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/account/subscriptions'
                : 'https://play.google.com/store/account/subscriptions';
              Alert.alert(
                t('premium.manageTitle'),
                t('premium.manageMessage'),
                [
                  { text: t('settings.cancel'), style: 'cancel' },
                  { text: t('premium.manageCta'), onPress: () => Linking.openURL(url) },
                ]
              );
            }}
          >
            <View style={styles.premiumIconBox}>
              <MaterialCommunityIcons name="star" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumActiveText}>{t('premium.settingsBannerActive')}</Text>
              <Text style={styles.premiumActiveSub}>{t('premium.upsellSubtitle')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#A8956A" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() => { analytics.logEvent('paywall_opened', { source: 'settings_banner' }); navigation.navigate('Paywall'); }}
            activeOpacity={0.9}
          >
            <Text style={styles.premiumDeco1}>+</Text>
            <Text style={styles.premiumDeco2}>+</Text>
            <View style={styles.premiumIconBox}>
              <View style={styles.premiumIconShine} />
              <MaterialCommunityIcons name="star" size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumBannerTitle}>{t('premium.settingsBannerTitle')}</Text>
              <Text style={styles.premiumBannerSub}>{t('premium.upsellSubtitle')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#A8956A" />
          </TouchableOpacity>
        )}

        {/* Quick action cards */}
        <View style={styles.quickCardsRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'rate_app' }); showReviewModalManually(); }}
            activeOpacity={0.85}
          >
            <View style={styles.quickCardIcon}>
              <MaterialCommunityIcons name="star" size={22} color="#FFD700" />
            </View>
            <Text style={styles.quickCardTitle}>{t('settings.rateApp')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'feedback' }); handleFeedback(); }}
            activeOpacity={0.85}
          >
            <View style={styles.quickCardIcon}>
              <MaterialCommunityIcons name="lightbulb-on" size={22} color="#FFD700" />
            </View>
            <Text style={styles.quickCardTitle}>{t('settings.feedback')}</Text>
          </TouchableOpacity>
        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D4AA50',
    padding: 16,
    marginBottom: 4,
  },
  premiumIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#E8960A',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  premiumIconShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 26,
    backgroundColor: 'rgba(255,220,80,0.35)',
    borderRadius: 14,
  },
  premiumBannerTitle: { fontSize: 16, fontWeight: '800', color: '#3B1F00', marginBottom: 4, lineHeight: 21 },
  premiumBannerSub: { fontSize: 13, color: '#7C5C2E', fontWeight: '400', lineHeight: 18 },
  premiumDeco1: { position: 'absolute', top: 12, right: 44, fontSize: 14, color: '#C9A84C', opacity: 0.6 },
  premiumDeco2: { position: 'absolute', bottom: 12, right: 26, fontSize: 10, color: '#C9A84C', opacity: 0.45 },
  premiumActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 4,
    borderWidth: 1.5, borderColor: '#D4AA50',
  },
  premiumActiveText: { fontSize: 14, fontWeight: '700', color: '#3B1F00' },
  premiumActiveSub: { fontSize: 12, color: '#7C5C2E', marginTop: 2 },

  quickCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#C75B4A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  quickCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
});



