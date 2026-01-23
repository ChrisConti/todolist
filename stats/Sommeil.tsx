import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useSommeilStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';

interface SommeilProps {
  navigation: any;
  tasks: Task[];
}

const Sommeil: React.FC<SommeilProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { dailyStats, chartData, lastTask, isLoading, error } = useSommeilStats(tasks);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderBar = (value: number, maxValue: number, color: string, isMax: boolean) => {
    if (value === 0) return null;
    const barHeight = (value / maxValue) * 200;
    return (
      <View style={[styles.bar, { height: barHeight, backgroundColor: color, opacity: isMax ? 1 : 0.5 }]} />
    );
  };

  const renderChart = () => {
    const dataValues = chartData.datasets[0].data as number[];
    const maxValue = Math.max(...dataValues);
    const yAxisLabels = [maxValue, maxValue / 2, 0].map(formatDuration);
    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>
        <View style={styles.chartContent}>
          {chartData.labels.map((label, index) => (
            <View key={index} style={styles.chartColumn}>
              {renderBar(dataValues[index], maxValue, '#E29656', dataValues[index] === maxValue)}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          ))}
        </View>
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
            <Text style={styles.titleParameter}>{t('sommeil.lastTask')}</Text>
            <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} /> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('sommeil.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View>
                <Text>{t('sommeil.today')}</Text>
                <Text>{t('sommeil.yesterday')}</Text>
                <Text>{t('sommeil.last7Days')}</Text>
              </View>
              <View>
                <Text>{formatDuration(dailyStats.today as number)}</Text>
                <Text>{formatDuration(dailyStats.yesterday as number)}</Text>
                <Text>{formatDuration(dailyStats.lastPeriod as number)}</Text>
              </View>
            </View>
          </View>
          <View style={{}}>
            <Text style={styles.titleParameter}>{t('sommeil.evolutionLast7Days')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('sommeil.noTaskFound')}</Text>}
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
  errorText: {
    color: '#C75B4A',
    fontSize: 14,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 220,
    marginVertical: 28,
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#7A8889',
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartLabel: {
    marginTop: 5,
  },
  bar: {
    width: 35,
    justifyContent: 'flex-end',
    alignItems: 'center',

  },
});

export default Sommeil;