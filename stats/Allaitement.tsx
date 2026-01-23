import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useAllaitementStats } from '../hooks/useTaskStatistics';
import { Task } from '../types';

const Allaitement = ({ navigation, tasks }: { navigation: any; tasks: Task[] }) => {
  const { t } = useTranslation();
  const { babyID } = useContext(AuthentificationUserContext);
  const [selectedItem, setSelectedItem] = useState(0);

  const { dailyStats, chartData, lastTask, isLoading, error } = useAllaitementStats(tasks);

  const boobSide = [
    { id: 0, side: t('allaitement.left'), name: t('allaitement.left'), nameTrad: 0 },
    { id: 1, side: t('allaitement.right'), name: t('allaitement.right'), nameTrad: 1 },
    { id: 2, side: t('allaitement.both'), name: t('allaitement.both'), nameTrad: 2 },
  ];

  const renderBarChart = () => {
    const allaitementChartData = chartData as any;
    const maxValue = Math.max(...allaitementChartData.total.filter((v: any) => typeof v === 'number'));
    const chartHeight = 150;
    const barWidth = 20;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {[maxValue, maxValue / 2, 0].map((value, index) => (
            <Text key={index} style={styles.yAxisLabel}>
              {value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`}
            </Text>
          ))}
        </View>
        <View style={styles.chartContent}>
          {allaitementChartData.labels.map((label: string, index: number) => (
            <View key={index} style={styles.chartColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (allaitementChartData.boobLeft[index] / maxValue) * chartHeight || 1,
                      backgroundColor: '#1AAAAA',
                      width: barWidth,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: (allaitementChartData.boobRight[index] / maxValue) * chartHeight || 1,
                      backgroundColor: '#E29656',
                      width: barWidth,
                    },
                  ]}
                />
              </View>
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
            <Text style={styles.titleParameter}>{t('allaitement.lastTask')}</Text>
            <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={styles.titleParameter}>{t('allaitement.someFigures')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
              {boobSide.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItem(item.id)}
                  style={selectedItem === item.id ? styles.imageSelected : styles.imageNonSelected}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View>
                <Text>{t('allaitement.today')}</Text>
                <Text>{t('allaitement.yesterday')}</Text>
                <Text>{t('allaitement.last7Days')}</Text>
              </View>
              <View>
                <Text>{(() => {
                  const allaitementStats = dailyStats as any;
                  const getStatsForSide = (stats: any, side: number) => {
                    if (side === 0) return stats.boobLeft;
                    if (side === 1) return stats.boobRight;
                    return stats.total;
                  };
                  const value = getStatsForSide(allaitementStats.today, selectedItem);
                  return value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`;
                })()}</Text>
                <Text>{(() => {
                  const allaitementStats = dailyStats as any;
                  const getStatsForSide = (stats: any, side: number) => {
                    if (side === 0) return stats.boobLeft;
                    if (side === 1) return stats.boobRight;
                    return stats.total;
                  };
                  const value = getStatsForSide(allaitementStats.yesterday, selectedItem);
                  return value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`;
                })()}</Text>
                <Text>{(() => {
                  const allaitementStats = dailyStats as any;
                  const getStatsForSide = (stats: any, side: number) => {
                    if (side === 0) return stats.boobLeft;
                    if (side === 1) return stats.boobRight;
                    return stats.total;
                  };
                  const value = getStatsForSide(allaitementStats.lastPeriod, selectedItem);
                  return value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`;
                })()}</Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.titleParameter}>{t('allaitement.evolutionLast7Days')}</Text>
            {renderBarChart()}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: '#1AAAAA', marginRight: 5 }} />
              <Text>{t('breast.left')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <View style={{ width: 10, height: 10, backgroundColor: "#E29656", marginRight: 5 }} />
              <Text>{t('breast.right')}</Text>
            </View>
          </View>
        </View> 
      : 
        <Text>{t('allaitement.noTaskFound')}</Text>}      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180,
    marginVertical: 20,
    borderRadius: 16,
    backgroundColor: '#FDF1E7',
    alignItems: 'flex-end',
    paddingBottom: 30,
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 10,
    marginLeft: 10,
    height: 150,
  },
  yAxisLabel: {
    fontSize: 10,
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
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  bar: {
    width: 18,
  },
  chartLabel: {
    marginTop: 5,
    fontSize: 10,
  },
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderColor: '#1AAAAA',
    borderWidth: 3,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  imageNonSelected: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 3,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#E0E0E0',
    minWidth: 80,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default Allaitement;