import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import React, { useMemo, useContext, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import { useReviewPrompt } from './Context/ReviewPromptContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePremium } from './Context/PremiumContext';
import { SUPPORT_EMAIL } from './utils/constants';
import { useTheme } from './Context/ThemeContext';
import { isNursingActivitySupported } from './utils/nursingActivityBridge';
import type { Theme } from './constants/theme';
import { initialOf } from './utils/initials';

const PREMIUM_PERKS = ['premium.perkStats', 'premium.perkExport', 'premium.perkWidget', 'premium.perkDarkMode'];

const Settings = ({ navigation }) => {
  const { userInfo } = useContext(AuthentificationUserContext);
  const { showReviewModalManually } = useReviewPrompt();
  const { isPremium } = usePremium();
  const { theme, canUseDarkMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    analytics.logScreenView('Settings');
  }, []);

  const handleContactUs = () => {
    const subject = 'Contact Tribu baby';
    const body = 'Hi there, I would like to...';
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err));
  };

  const handleFeedback = () => {
    const subject = 'Feedback';
    const body = 'Hi, I would like to suggest...';
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err));
  };

  const openPaywall = (source: string) => {
    analytics.logEvent('paywall_opened', { source });
    navigation.navigate('Paywall');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{t('title.settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Carte profil : ouvre Mon profil (nom, email, mot de passe, déconnexion, suppression) */}
        <TouchableOpacity
          style={[styles.card, styles.profileCard]}
          activeOpacity={0.85}
          onPress={() => {
            analytics.logEvent('settings_item_tapped', { item: 'profile_card' });
            navigation.navigate('MyProfile');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.editProfile')}
        >
          <View>
            <View style={[styles.avatar, isPremium && styles.avatarPremium]}>
              <Text style={styles.avatarText}>{initialOf(userInfo?.username, userInfo?.email)}</Text>
            </View>
            {isPremium && (
              <View style={styles.crownBadge} accessibilityLabel={t('premium.cardTitle')}>
                <MaterialCommunityIcons name="crown" size={19} color={theme.gold} />
              </View>
            )}
          </View>
          <Text style={styles.profileName} numberOfLines={1}>{userInfo?.username}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{userInfo?.email}</Text>
          {isPremium && <Text style={styles.premiumLabel}>{t('premium.cardTitle')}</Text>}
          <View style={styles.editPill}>
            <Text style={styles.editPillText}>{t('settings.editProfile')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.accent} />
          </View>
        </TouchableOpacity>

        {/* Carte Premium, uniquement hors premium, juste sous le profil : visible sans défiler */}
        {!isPremium && (
          <View style={styles.premiumCard}>
            <MaterialCommunityIcons name="crown" size={150} color={theme.onPremiumSurface} style={styles.premiumWatermark} />
            <View style={styles.premiumTitleRow}>
              <MaterialCommunityIcons name="crown" size={26} color={theme.gold} />
              <Text style={styles.premiumTitle}>{t('premium.cardTitle')}</Text>
            </View>
            <View style={styles.perks}>
              {PREMIUM_PERKS.map((key) => (
                <View key={key} style={styles.perk}>
                  <MaterialCommunityIcons name="check" size={17} color={theme.gold} />
                  <Text style={styles.perkText}>{t(key)}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.premiumCta} onPress={() => openPaywall('settings_banner')} activeOpacity={0.9}>
              <Text style={styles.premiumCtaText}>{t('premium.settingsBannerTitle')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Préférences */}
        <View style={[styles.card, styles.prefCard]}>
          <Text style={styles.cardTitle}>{t('settings.preferences')}</Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.prefRow}
            onPress={() => {
              analytics.logEvent('settings_item_tapped', { item: 'dark_mode' });
              navigation.navigate('DarkModeSetting');
            }}
          >
            <View style={[styles.iconTile, { backgroundColor: theme.tintViolet }]}>
              <MaterialCommunityIcons name="weather-night" size={20} color={theme.categoryAccent[4]} />
            </View>
            <Text style={styles.prefLabel}>
              {t('settings.darkMode')}{!canUseDarkMode && <Text style={styles.star}> ★</Text>}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {isNursingActivitySupported() && (
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.prefRow, styles.prefRowBorder]}
              onPress={() => {
                analytics.logEvent('settings_item_tapped', { item: 'nursing_live_activity' });
                navigation.navigate('NursingLockScreenSetting');
              }}
            >
              <View style={[styles.iconTile, { backgroundColor: theme.tintTeal }]}>
                <MaterialCommunityIcons name="cellphone-lock" size={20} color={theme.onTintTeal} />
              </View>
              <Text style={styles.prefLabel}>{t('settings.nursingLockScreenShort')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.prefRow, styles.prefRowBorder]}
            onPress={() => {
              analytics.logEvent('settings_item_tapped', { item: 'email_opt_in' });
              navigation.navigate('EmailOptIn');
            }}
          >
            <View style={[styles.iconTile, { backgroundColor: theme.tintTerracotta }]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={theme.onTintTerracotta} />
            </View>
            <Text style={styles.prefLabel}>{t('settings.emailOptIn')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Aidez-nous / Notez-nous */}
        <View style={styles.halfRow}>
          <TouchableOpacity
            style={[styles.card, styles.halfCard]}
            onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'feedback' }); handleFeedback(); }}
            activeOpacity={0.85}
          >
            <View style={[styles.iconTileLarge, { backgroundColor: theme.tintSage }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={theme.onTintSage} />
            </View>
            <Text style={styles.halfTitle}>{t('settings.helpUs')}</Text>
            <Text style={styles.halfSub}>{t('settings.helpUsSub')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, styles.halfCard]}
            onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'rate_app' }); showReviewModalManually(); }}
            activeOpacity={0.85}
          >
            <View style={[styles.iconTileLarge, { backgroundColor: theme.tintGold }]}>
              <MaterialCommunityIcons name="star" size={22} color={theme.onTintGold} />
            </View>
            <Text style={styles.halfTitle}>{t('settings.rateUs')}</Text>
            <Text style={styles.halfSub}>{t('settings.rateUsSub')}</Text>
          </TouchableOpacity>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerLink} onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'contact_us' }); handleContactUs(); }}>
            <Text style={styles.footerText}>{t('settings.contactUs')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLink} onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'privacy_policy' }); navigation.navigate('PrivacyPolicy'); }}>
            <Text style={styles.footerText}>{t('settings.privacyShort')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLink} onPress={() => { analytics.logEvent('settings_item_tapped', { item: 'terms_of_use' }); navigation.navigate('TermsOfUse'); }}>
            <Text style={styles.footerText}>{t('settings.termsShort')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Settings;

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    justifyContent: 'center', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: theme.headerBackground,
  },
  headerTitle: { fontSize: 22, color: theme.onHeader, fontFamily: 'Pacifico', textAlign: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0 : 0.06,
    shadowRadius: 12,
    elevation: theme.dark ? 0 : 2,
  },

  // Profil
  profileCard: { alignItems: 'center', paddingTop: 26, paddingBottom: 20, paddingHorizontal: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.tintTerracotta,
    borderWidth: 2, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPremium: { borderWidth: 3, borderColor: theme.gold },
  avatarText: { fontSize: 32, fontWeight: '700', color: theme.onTintTerracotta },
  crownBadge: {
    position: 'absolute', top: -16, alignSelf: 'center',
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.premiumSurface,
    borderWidth: 3, borderColor: theme.card,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  profileName: { fontSize: 22, fontWeight: '800', color: theme.text, marginTop: 12 },
  profileEmail: { fontSize: 15, color: theme.textSecondary, marginTop: 2 },
  premiumLabel: {
    marginTop: 6, fontSize: 12, fontWeight: '800', letterSpacing: 1.2,
    textTransform: 'uppercase', color: theme.goldText,
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 14, paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: 999, backgroundColor: theme.background,
  },
  editPillText: { fontSize: 14, fontWeight: '700', color: theme.accent },

  // Préférences
  prefCard: { paddingBottom: 4 },
  cardTitle: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: theme.textSecondary,
    paddingTop: 16, paddingHorizontal: 20, paddingBottom: 4,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingHorizontal: 20 },
  prefRowBorder: { borderTopWidth: 1, borderTopColor: theme.separator },
  iconTile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  star: { color: theme.gold },

  // Aidez-nous / Notez-nous
  halfRow: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, padding: 18, gap: 4 },
  iconTileLarge: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  halfTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  halfSub: { fontSize: 13, lineHeight: 18, color: theme.textSecondary },

  // Premium
  premiumCard: {
    backgroundColor: theme.premiumSurface, borderRadius: 24,
    padding: 20, paddingTop: 22, gap: 16, overflow: 'hidden',
    // En sombre, la surface se confond presque avec le fond : un liseré doré la détache.
    borderWidth: theme.dark ? 1 : 0, borderColor: theme.gold,
  },
  premiumWatermark: { position: 'absolute', right: -26, top: -36, opacity: 0.08 },
  premiumTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumTitle: { fontSize: 20, fontWeight: '800', color: theme.onPremiumSurface },
  perks: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  perk: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  perkText: { flexShrink: 1, fontSize: 14, color: theme.premiumSurfaceMuted },
  premiumCta: {
    backgroundColor: theme.gold, borderRadius: 14, minHeight: 50,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  premiumCtaText: { fontSize: 16, fontWeight: '800', color: theme.onGold, textAlign: 'center' },

  // Pied de page
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14 },
  footerLink: { minHeight: 44, justifyContent: 'center' },
  footerText: { fontSize: 13.5, color: theme.accent },
});
