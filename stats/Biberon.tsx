import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useBiberonStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';

interface BiberonProps {
  navigation: any;
  tasks: Task[];
}

const Biberon: React.FC<BiberonProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { dailyStats, chartData, lastTask, isLoading, error } = useBiberonStats(tasks);

  const renderBar = (value: number, maxValue: number, color: string, isMax: boolean) => {
    const barWidth = (value / maxValue) * 200;
    return (
      <View style={[styles.barContainer]}>
        <View style={[styles.bar, { width: barWidth, backgroundColor: color, opacity: isMax ? 1 : 0.5 }]}>
          <Text style={styles.barText}>{value ? value : ''}</Text>
        </View>
        {value ? <View style={[styles.arrow, { opacity: isMax ? 1 : 0.5 }]} /> : null}
      </View>
    );
  };

  const renderChart = () => {
    const dataValues = chartData.datasets[0].data as number[];
    const maxValue = Math.max(...dataValues);
    return (
      <View style={styles.chartContainer}>
        {chartData.labels.map((label, index) => (
          <View key={index} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{label}</Text>
            {renderBar(dataValues[index], maxValue, '#34777B', dataValues[index] === maxValue)}
          </View>
        ))}
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
            <Text style={styles.titleParameter}>{t('biberon.lastTask')}</Text>
            <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} /> 
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('biberon.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View>
                <Text>{t('biberon.today')}</Text>
                <Text>{t('biberon.yesterday')}</Text>
                <Text>{t('biberon.last7Days')}</Text>
              </View>
              <View>
                <Text>{dailyStats.today} ml</Text>
                <Text>{dailyStats.yesterday} ml</Text>
                <Text>{dailyStats.lastPeriod} ml</Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.titleParameter}>{t('biberon.evolutionLast7Days')}</Text>
            {renderChart()}
          </View>
        </View>
      : 
      <Text>{t('biberon.noTaskFound')}</Text>}
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
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    height: 220,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  chartLabel: {
    width: 50,
    marginRight: 10,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderTopColor: 'transparent',
    borderBottomWidth: 15,
    borderBottomColor: 'transparent',
    borderLeftWidth: 15,
    borderLeftColor: '#34777B',
  },
  barText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
});

export default Biberon;