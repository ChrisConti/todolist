import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import analytics from '../services/analytics';

const OPTIONS = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLightShort' },
  { value: 'dark', labelKey: 'settings.themeDarkShort' },
] as const;

// Ouvert depuis la carte Préférences, comme l'écran verrouillé allaitement.
// Hors premium : choix grisés et bouton Débloquer vers le paywall.
const DarkModeSetting = ({ navigation }) => {
  const { theme, preference, setPreference, canUseDarkMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();

  useEffect(() => {
    analytics.logScreenView('DarkModeSetting');
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {OPTIONS.map(({ value, labelKey }, i) => {
          const selected = canUseDarkMode && preference === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.row, i > 0 && styles.rowBorder]}
              disabled={!canUseDarkMode}
              onPress={() => {
                setPreference(value);
                analytics.logEvent('theme_preference_changed', { preference: value });
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !canUseDarkMode }}
              accessibilityLabel={t(labelKey)}
            >
              <Text style={[styles.label, !canUseDarkMode && styles.labelLocked]}>
                {t(labelKey)}{!canUseDarkMode && <Text style={styles.star}> ★</Text>}
              </Text>
              {selected && <MaterialCommunityIcons name="check" size={22} color={theme.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {!canUseDarkMode && (
        <TouchableOpacity
          style={styles.unlock}
          accessibilityRole="button"
          onPress={() => {
            analytics.logEvent('paywall_opened', { source: 'dark_mode' });
            navigation.navigate('Paywall');
          }}
        >
          <MaterialCommunityIcons name="crown" size={18} color={theme.gold} />
          <Text style={styles.unlockText}>{t('premium.cta_short')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default DarkModeSetting;

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingTop: 24, gap: 20 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0 : 0.06,
    shadowRadius: 12,
    elevation: theme.dark ? 0 : 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 20 },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.separator },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  labelLocked: { color: theme.textMuted },
  star: { color: theme.gold },
  unlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.premiumSurface, borderRadius: 14, minHeight: 50,
    borderWidth: theme.dark ? 1 : 0, borderColor: theme.gold,
  },
  unlockText: { fontSize: 16, fontWeight: '800', color: theme.gold },
});
