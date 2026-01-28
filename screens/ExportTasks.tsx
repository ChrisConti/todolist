import React, { useContext, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { query, where, getDocs } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import { exportTasksToCSV, getDateRangePresets } from '../utils/exportTasks';
import analytics from '../services/analytics';
import moment from 'moment';

const ExportTasks = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { user, babyID } = useContext(AuthentificationUserContext);
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
      const querySnapshot = await getDocs(babyQuery);
      
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

    setLoading(true);

    // Track export button click
    analytics.logEvent('export_button_clicked', {
      period: selectedPeriod,
      task_count: babyData.tasks.length,
      baby_id: babyID,
      user_id: user.uid,
    });

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

      analytics.logEvent('tasks_exported', {
        period: selectedPeriod,
        task_count: babyData.tasks.length,
        baby_id: babyID,
        user_id: user.uid,
      });

      Alert.alert(
        t('success.title'),
        t('success.tasksExported')
      );
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

        <TouchableOpacity
          style={[styles.exportButton, loading && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={loading || !babyData}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.exportButtonText}>
              📥 {t('export.page.exportButton')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          {t('export.page.helpText')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
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
    color: '#333',
    marginBottom: 15,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  periodButtonSelected: {
    borderColor: '#C75B4A',
    backgroundColor: '#FDF1E7',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C75B4A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C75B4A',
  },
  periodTextContainer: {
    flex: 1,
  },
  periodText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  periodTextSelected: {
    color: '#C75B4A',
    fontWeight: '600',
  },
  periodSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 3,
  },
  formatInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
  },
  formatText: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  exportButtonDisabled: {
    backgroundColor: '#D8ABA0',
    opacity: 0.7,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ExportTasks;
