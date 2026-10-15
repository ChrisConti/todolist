import React, { useContext, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { query, where, getDocsFromServer } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import { exportTasksToCSV, getDateRangePresets } from '../utils/exportTasks';
import analytics from '../services/analytics';
import moment from 'moment';
import { usePremium } from '../Context/PremiumContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';

const ExportTasks = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const { user, babyID } = useContext(AuthentificationUserContext);
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [babyData, setBabyData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last7Days');

  const datePresets = useMemo(() => getDateRangePresets(t), [t]);

  useEffect(() => {
    fetchBabyData();
  }, [babyID]);

  const fetchBabyData = async () => {
    if (!babyID) return;

    try {
      const babyQuery = query(babiesRef, where('id', '==', babyID));
      const querySnapshot = await getDocsFromServer(babyQuery);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setBabyData(data);
      }
    } catch (error) {
      console.error('Error fetching baby data:', error);
    }
  };

  const handleExport = async () => {
    if (!user || !user.uid) {
      console.error('Cannot export: user not authenticated');
      Alert.alert(t('error.title'), t('error.userNotAuthenticated'));
      return;
    }

    if (!babyData || !babyData.tasks) {
      Alert.alert(
        t('error.title'),
        t('error.noTasksToExport')
      );
      return;
    }

    // Non-critical — wrapped so a throw never prevents the export
    try {
      analytics.logEvent('export_button_clicked', {
        period: selectedPeriod,
        task_count: babyData.tasks.length,
        baby_id: babyID,
        user_id: user.uid,
      });
    } catch {}

    setLoading(true);

    try {
      const preset = datePresets[selectedPeriod];

      await exportTasksToCSV({
        tasks: babyData.tasks,
        babyName: babyData.name,
        startDate: preset.startDate,
        endDate: preset.endDate,
        language: i18n.language,
        maxTasks: preset.maxTasks,
      });

      Alert.alert(
        t('success.title'),
        t('success.tasksExported')
      );

      // Non-critical — don't fail the export if analytics throws
      try {
        analytics.logEvent('tasks_exported', {
          period: selectedPeriod,
          task_count: babyData.tasks.length,
          baby_id: babyID,
          user_id: user.uid,
        });
      } catch {}

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        t('error.title'),
        t('error.exportFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('export.page.selectPeriod')}</Text>
          
          {Object.entries(datePresets).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.periodButton,
                selectedPeriod === key && styles.periodButtonSelected,
              ]}
              onPress={() => setSelectedPeriod(key)}
            >
              <View style={styles.radioOuter}>
                {selectedPeriod === key && <View style={styles.radioInner} />}
              </View>
              <View style={styles.periodTextContainer}>
                <Text style={[
                  styles.periodText,
                  selectedPeriod === key && styles.periodTextSelected,
                ]}>
                  {value.label}
                </Text>
                {value.startDate && (
                  <Text style={styles.periodSubtext}>
                    {moment(value.startDate).format('DD/MM/YYYY')} - {moment(value.endDate).format('DD/MM/YYYY')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formatInfo}>
          <Text style={styles.formatText}>{t('export.page.formatCSV')}</Text>
        </View>

        {!isPremium ? (
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => { analytics.logEvent('paywall_opened', { source: 'export_button' }); navigation.navigate('Paywall'); }}
            activeOpacity={0.85}
          >
            <View style={styles.premiumButtonIcon}>
              <View style={styles.premiumButtonIconShine} />
              <MaterialCommunityIcons name="star" size={18} color={theme.onPrimary} />
            </View>
            <View>
              <Text style={styles.exportButtonText}>{t('premium.exportCta')}</Text>
              <Text style={styles.premiumButtonSub}>{t('premium.exportCtaSub')}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.exportButton, loading && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={loading || !babyData}
          >
            {loading ? (
              <ActivityIndicator color={theme.onDisabled} />
            ) : (
              <>
                <MaterialCommunityIcons name="file-export" size={20} color={theme.onPrimary} />
                <Text style={styles.exportButtonText}>{t('export.page.exportButton')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.helpText}>
          {t('export.page.helpText')}
        </Text>
      </View>
    </ScrollView>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 15,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.separator,
  },
  periodButtonSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.background,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  periodTextContainer: {
    flex: 1,
  },
  periodText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  periodTextSelected: {
    color: theme.accent,
    fontWeight: '600',
  },
  periodSubtext: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 3,
  },
  formatInfo: {
    backgroundColor: theme.soft,
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
  },
  formatText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  exportButton: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 15,
  },
  exportButtonDisabled: {
    backgroundColor: theme.disabled,
    opacity: 0.7,
  },
  exportButtonText: {
    color: theme.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.gold,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  premiumButtonIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.gold,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  premiumButtonIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 19,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 10,
  },
  premiumButtonSub: {
    color: theme.goldText,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  helpText: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ExportTasks;
