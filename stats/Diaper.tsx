import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useDiaperStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';

interface DiaperProps {
  navigation: any;
  tasks: Task[];
}

const Diaper: React.FC<DiaperProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState(0);
  const { dailyStats, dailyContentStats, chartData, contentChartData, separateCharts, lastTask, isLoading, error } = useDiaperStats(tasks, t);

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad: 0 },
    { id: 1, name: t('diapers.mou'), nameTrad: 1 },
    { id: 2, name: t('diapers.liquide'), nameTrad: 2 },
  ];

  const handleCategoryCaca = (selectedItem: number) => {
    const diaperType = imagesDiapers[selectedItem].id;
    const todayValue = (dailyStats.today as { [key: string]: number })[diaperType];
    const yesterdayValue = (dailyStats.yesterday as { [key: string]: number })[diaperType];
    const lastPeriodValue = (dailyStats.lastPeriod as { [key: string]: number })[diaperType];

    return (
      <View key={diaperType}>
        <Text style={styles.titleParameter}>{t('diapers.someFigures')}</Text>
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View>
            <Text>{t('diapers.today')}</Text>
            <Text>{t('diapers.yesterday')}</Text>
            <Text>{t('diapers.last7Days')}</Text>
          </View>
          <View>
            <Text>{todayValue}</Text>
            <Text>{yesterdayValue}</Text>
            <Text>{lastPeriodValue}</Text>
          </View>
        </View>
      </View>
    );
  };

  const handleContentStats = () => {
    const peeToday = (dailyContentStats.today as { [key: string]: number })[0];
    const poopToday = (dailyContentStats.today as { [key: string]: number })[1];
    const bothToday = (dailyContentStats.today as { [key: string]: number })[2];

    const peeYesterday = (dailyContentStats.yesterday as { [key: string]: number })[0];
    const poopYesterday = (dailyContentStats.yesterday as { [key: string]: number })[1];
    const bothYesterday = (dailyContentStats.yesterday as { [key: string]: number })[2];

    const peeLast7 = (dailyContentStats.lastPeriod as { [key: string]: number })[0];
    const poopLast7 = (dailyContentStats.lastPeriod as { [key: string]: number })[1];
    const bothLast7 = (dailyContentStats.lastPeriod as { [key: string]: number })[2];

    return (
      <View>
        <Text style={styles.titleParameter}>{t('diapers.content')}</Text>
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View>
            <Text style={{ marginBottom: 5 }}>{t('diapers.today')}</Text>
            <Text style={{ marginBottom: 5 }}>{t('diapers.yesterday')}</Text>
            <Text>{t('diapers.last7Days')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.contentLabel}>💧</Text>
            <Text style={{ marginBottom: 5 }}>{peeToday}</Text>
            <Text style={{ marginBottom: 5 }}>{peeYesterday}</Text>
            <Text>{peeLast7}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.contentLabel}>💩</Text>
            <Text style={{ marginBottom: 5 }}>{poopToday}</Text>
            <Text style={{ marginBottom: 5 }}>{poopYesterday}</Text>
            <Text>{poopLast7}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.contentLabel}>💧💩</Text>
            <Text style={{ marginBottom: 5 }}>{bothToday}</Text>
            <Text style={{ marginBottom: 5 }}>{bothYesterday}</Text>
            <Text>{bothLast7}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBar = (value: number | string, maxValue: number, color: string) => {
    if (!value) return null;
    const numValue = typeof value === 'string' ? 0 : value;
    const barHeight = (numValue / maxValue) * 120;
    return (
      <View style={[styles.bar, { height: barHeight, backgroundColor: color }]}>
        <Text style={styles.barText}>{value}</Text>
      </View>
    );
  };

  const renderChart = () => {
    const stackedChartData = chartData as any;
    const flatData = stackedChartData.data.flat().filter((v: any) => typeof v === 'number');
    const maxValue = flatData.length > 0 ? Math.max(...flatData) : 1;

    return (
      <View style={styles.chartContainer}>
        {stackedChartData.labels.map((label: string, index: number) => {
          const dayData = stackedChartData.data[index];
          const dayTotal = dayData.reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0);
          return (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.totalLabel}>{dayTotal ? dayTotal : ''}</Text>
              {dayData.map((value: any, idx: number) => (
                <View key={idx}>
                  {renderBar(value, maxValue, stackedChartData.barColors[idx])}
                </View>
              ))}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderContentChart = () => {
    const stackedChartData = contentChartData as any;
    const flatData = stackedChartData.data.flat().filter((v: any) => typeof v === 'number');
    const maxValue = flatData.length > 0 ? Math.max(...flatData) : 1;

    return (
      <View style={styles.chartContainer}>
        {stackedChartData.labels.map((label: string, index: number) => {
          const dayData = stackedChartData.data[index];
          const dayTotal = dayData.reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0);
          return (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.totalLabel}>{dayTotal ? dayTotal : ''}</Text>
              {dayData.map((value: any, idx: number) => (
                <View key={idx}>
                  {renderBar(value, maxValue, stackedChartData.barColors[idx])}
                </View>
              ))}
              <Text style={styles.chartLabel}>{label}</Text>
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
        <View>
          <Text style={styles.titleParameter}>{t('diapers.lastTask')}</Text>
          <View>
            <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
          </View>
        </View>

        <View>
          {handleCategoryCaca(selectedItem)}
        </View>

        <View style={{ marginTop: 20 }}>
          {handleContentStats()}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.titleParameter}>{t('diapers.last7DaysStacked')}</Text>
          {renderChart()}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            {imagesDiapers.map((image, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
                <View style={{ width: 10, height: 10, backgroundColor: (chartData as any).barColors[index], marginRight: 5 }} />
                <Text>{image.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.titleParameter}>{t('diapers.content')} - {t('diapers.last7DaysStacked')}</Text>
          {renderContentChart()}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: (contentChartData as any).barColors[0], marginRight: 5 }} />
              <Text>💧 {t('diapers.pee')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: (contentChartData as any).barColors[1], marginRight: 5 }} />
              <Text>💩 {t('diapers.poop')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: (contentChartData as any).barColors[2], marginRight: 5 }} />
              <Text>💧💩 {t('diapers.both')}</Text>
            </View>
          </View>
        </View>
      </View> 
      : 
      <Text>{t('diapers.noTaskFound')}</Text>}      
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
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 65,
    height: 65,
    resizeMode: 'cover',
    borderColor: '#C75B4A',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 65,
    height: 65,
    resizeMode: 'cover',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'transparent',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
    paddingVertical: 10, // Add padding to avoid shrinking
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1, // Allow columns to expand
  },
  chartLabel: {
    marginBottom: 5,
  },
  bar: {
    width: 30,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalLabel: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  contentLabel: {
    fontSize: 18,
    marginBottom: 5,
    fontWeight: 'bold',
  },
});

export default Diaper;