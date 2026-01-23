import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useThermoStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';

interface ThermoProps {
  navigation: any;
  tasks: Task[];
}

const Thermo: React.FC<ThermoProps> = ({ navigation, tasks }) => {
  const { t, i18n } = useTranslation();
  const { dailyStats, chartData, lastTask, isLoading, error } = useThermoStats(tasks, i18n.language);

  const renderChart = () => {
    const temperatureData = (chartData as any).temperatureData || [];
    
    if (temperatureData.length === 0) {
      return <Text style={styles.noDataText}>{t('thermo.noData')}</Text>;
    }
    
    return (
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Heure</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Température</Text>
        </View>
        
        {/* Rows */}
        {temperatureData.map((row: any, index: number) => {
          let backgroundColor = 'transparent';
          let textColor = '#000';
          
          if (row.isMax) {
            backgroundColor = '#FFE5E5';
            textColor = '#C75B4A';
          } else if (row.isMin) {
            backgroundColor = '#E5F5E5';
            textColor = '#4CAF50';
          }
          
          return (
            <View 
              key={index} 
              style={[
                styles.tableRow, 
                { backgroundColor },
                index % 2 === 0 && !row.isMax && !row.isMin ? styles.tableRowEven : null
              ]}
            >
              <Text style={[styles.tableCell, { flex: 1, color: textColor }]}>{row.time}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: row.isMin || row.isMax ? 'bold' : 'normal', color: textColor }]}>
                {row.temp.toFixed(1)}°
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lastTask ? 
        <View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('thermo.lastTask')}</Text>
            <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false}/> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('thermo.someFigures')}</Text>
            
            {/* Aujourd'hui */}
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.sectionTitle}>{t('thermo.today')}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View>
                  <Text style={styles.labelText}>Min:</Text>
                  <Text style={styles.labelText}>Max:</Text>
                </View>
                <View>
                  <Text style={styles.valueText}>{dailyStats.today.min !== null ? `${dailyStats.today.min.toFixed(1)}°` : 'N/A'}</Text>
                  <Text style={styles.valueText}>{dailyStats.today.max !== null ? `${dailyStats.today.max.toFixed(1)}°` : 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Hier */}
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.sectionTitle}>{t('thermo.yesterday')}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View>
                  <Text style={styles.labelText}>Min:</Text>
                  <Text style={styles.labelText}>Max:</Text>
                </View>
                <View>
                  <Text style={styles.valueText}>{dailyStats.yesterday.min !== null ? `${dailyStats.yesterday.min.toFixed(1)}°` : 'N/A'}</Text>
                  <Text style={styles.valueText}>{dailyStats.yesterday.max !== null ? `${dailyStats.yesterday.max.toFixed(1)}°` : 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>{t('thermo.evolutionLast24Hours')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('thermo.noTaskFound')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34777B',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    color: '#7A8889',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  errorText: {
    color: '#C75B4A',
    fontSize: 14,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#FDF1E7',
    borderRadius: 16,
    padding: 10,
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#C75B4A',
    paddingBottom: 10,
    marginBottom: 5,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7A8889',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  tableRowEven: {
    backgroundColor: 'transparent',
  },
  tableRowOdd: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tableCell: {
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
  },
  noDataText: {
    textAlign: 'center',
    color: '#7A8889',
    fontSize: 14,
    marginTop: 20,
  },
});

export default Thermo;