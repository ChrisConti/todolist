import React, { useMemo, useState, useEffect } from 'react';
import { useTheme } from '../../Context/ThemeContext';
import type { Theme } from '../../constants/theme';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import analytics from '../../services/analytics';
import { SUPPORT_EMAIL } from '../../utils/constants';

const MIN_VISITS = 3;

interface Props {
  userId?: string;
}

const SleepFeedbackWidget: React.FC<Props> = ({ userId }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [visible, setVisible]       = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const givenKey  = `sleep_feedback_given_${userId}`;
      const visitsKey = `sleep_adv_visits_${userId}`;
      const given = await AsyncStorage.getItem(givenKey);
      if (given === 'true') return;
      const v = parseInt((await AsyncStorage.getItem(visitsKey)) ?? '0', 10) + 1;
      await AsyncStorage.setItem(visitsKey, v.toString());
      if (v >= MIN_VISITS) {
        setVisible(true);
        analytics.logEvent('sleep_stats_feedback_shown', { visits: v });
      }
    })();
  }, [userId]);

  const handleYes = async () => {
    analytics.logEvent('sleep_stats_feedback_positive');
    if (userId) await AsyncStorage.setItem(`sleep_feedback_given_${userId}`, 'true');
    setShowThanks(true);
    setTimeout(() => setVisible(false), 2000);
  };

  const handleIdea = async () => {
    analytics.logEvent('sleep_stats_feedback_idea_tapped');
    if (userId) await AsyncStorage.setItem(`sleep_feedback_given_${userId}`, 'true');
    const subject = 'Idée stats sommeil';
    const body    = 'Bonjour, voici mon idée pour améliorer les stats sommeil...';
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {showThanks ? (
        <Text style={styles.thanks}>{t('sleepAdvanced.feedbackThanks')}</Text>
      ) : (
        <>
          <Text style={styles.title}>{t('sleepAdvanced.feedbackTitle')}</Text>
          <View style={styles.btns}>
            <TouchableOpacity style={styles.yesBtn} onPress={handleYes}>
              <Text style={styles.yesTxt}>{t('sleepAdvanced.feedbackYes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ideaBtn} onPress={handleIdea}>
              <Text style={styles.ideaTxt}>{t('sleepAdvanced.feedbackIdea')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { backgroundColor: theme.card, borderRadius: 12, padding: 14, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  title:     { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 12, textAlign: 'center' },
  btns:      { flexDirection: 'row', gap: 10, width: '100%' },
  yesBtn:    { flex: 1, backgroundColor: theme.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  yesTxt:    { color: theme.card, fontWeight: '700', fontSize: 13 },
  ideaBtn:   { flex: 1, backgroundColor: theme.soft, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ideaTxt:   { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
  thanks:    { fontSize: 16, fontWeight: '700', color: theme.success },
});

export default SleepFeedbackWidget;
