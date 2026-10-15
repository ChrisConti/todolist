import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import analytics from '../services/analytics';
import { getNursingActivityEnabled, setNursingActivityEnabled } from '../utils/nursingActivityBridge';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';

const NursingLockScreenSetting = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    analytics.logScreenView('NursingLockScreenSetting');
    getNursingActivityEnabled().then(setEnabled);
  }, []);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    setNursingActivityEnabled(value);
    analytics.logEvent('settings_item_tapped', { item: 'nursing_live_activity', enabled: value });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      {/* Illustration : reproduction de la Live Activity sur un écran verrouillé */}
      <View style={styles.lockScreenMock}>
        <Text style={styles.mockClock}>21:47</Text>
        <View style={styles.activityCard}>
          <View style={styles.mascotGroup}>
            <Image source={require('../assets/baby.png')} style={styles.mascot} resizeMode="contain" />
            <Text style={styles.mascotEmoji}>🤱</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.startedLabel}>{t('task.startedAtTime')}</Text>
            <Text style={styles.startedTime}>14:02</Text>
          </View>
          <View style={styles.chronoCol}>
            <Text style={styles.chronoLabel}>{t('L')}</Text>
            <Text style={styles.chrono}>12:34</Text>
          </View>
          <View style={styles.chronoCol}>
            <Text style={styles.chronoLabel}>{t('R')}</Text>
            <Text style={styles.chrono}>05:12</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description}>{t('settings.nursingLockScreenDescription')}</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('settings.nursingLockScreen')}</Text>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          thumbColor={enabled ? theme.primary : theme.textMuted}
          trackColor={{ false: theme.separator, true: theme.switchOn }}
        />
      </View>
    </ScrollView>
  );
};

export default NursingLockScreenSetting;

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 24,
  },
  lockScreenMock: {
    backgroundColor: '#1C1C2E',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  mockClock: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 44,
    fontWeight: '200',
    marginBottom: 18,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C75B4A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  mascotGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mascot: {
    width: 30,
    height: 44,
  },
  mascotEmoji: {
    fontSize: 20,
    marginLeft: 2,
  },
  startedLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  startedTime: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chronoCol: {
    alignItems: 'center',
    marginLeft: 14,
  },
  chronoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  chrono: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  description: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    marginRight: 12,
  },
});
