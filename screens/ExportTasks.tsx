import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { query, where, getDocs } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import { exportTasksToCSV, getDateRangePresets } from '../utils/exportTasks';
import analytics from '../services/analytics';
import moment from 'moment';

const ExportTasks = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, babyID } = useContext(AuthentificationUserContext);
  const [loading, setLoading] = useState(false);
  const [babyData, setBabyData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last30Days');

  const datePresets = getDateRangePresets();

  useEffect(() => {
    analytics.logScreenView('ExportTasks');
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

    try {
      const preset = datePresets[selectedPeriod];
      
      await exportTasksToCSV({
        tasks: babyData.tasks,
        babyName: babyData.name,
        startDate: preset.startDate,
        endDate: preset.endDate,
      });

      analytics.logEvent('tasks_exported', {
        period: selectedPeriod,
        taskCount: babyData.tasks.length,
        babyId: babyID,
        userId: user.uid,
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
      
      analytics.logEvent('export_failed', {
        error: error.message,
        userId: user.uid,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTaskCount = () => {
    if (!babyData || !babyData.tasks) return 0;

    const preset = datePresets[selectedPeriod];
    if (!preset.startDate && !preset.endDate) {
      return babyData.tasks.length;
    }

    return babyData.tasks.filter((task) => {
      const taskDate = new Date(task.date);
      if (preset.startDate && taskDate < preset.startDate) return false;
      if (preset.endDate && taskDate > preset.endDate) return false;
      return true;
    }).length;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Exporter les tâches</Text>
        <Text style={styles.subtitle}>
          {babyData ? `pour ${babyData.name}` : 'Chargement...'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionnez la période :</Text>
          
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

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📊 {getFilteredTaskCount()} tâche{getFilteredTaskCount() > 1 ? 's' : ''} seront exportées
          </Text>
        </View>

        <View style={styles.formatInfo}>
          <Text style={styles.formatTitle}>Format d'export :</Text>
          <Text style={styles.formatText}>• Fichier CSV (compatible Excel, Google Sheets)</Text>
          <Text style={styles.formatText}>• Colonnes : Date, Heure, Type, Détails, Durée, Créé par, Commentaire</Text>
          <Text style={styles.formatText}>• Encodage UTF-8 avec BOM</Text>
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
              📥 Exporter vers CSV
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Le fichier sera partagé via le menu de partage de votre appareil.
          Vous pourrez l'ouvrir dans Excel, Google Sheets, Numbers ou toute autre application.
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
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
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
    fontWeight: '600',
  },
  periodSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 3,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  formatInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formatText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exportButton: {
    backgroundColor: '#FF6B6B',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonDisabled: {
    backgroundColor: '#CCC',
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 18,
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
