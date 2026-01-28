import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useDiaperStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SectionTitle from '../components/stats/SectionTitle';
import StackedBarChart from '../components/stats/charts/StackedBarChart';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { STATS_CONFIG } from '../constants/statsConfig';

interface DiaperProps {
  navigation: any;
  tasks: Task[];
}

const Diaper: React.FC<DiaperProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const { dailyCountStats, countChartData, dailyStats, dailyContentStats, chartData, contentChartData, lastTask, isLoading, error } = useDiaperStats(tasks, t);

  const [selectedTab, setSelectedTab] = useState<'count' | 'type' | 'content'>('count');

  const renderCountStats = () => {
    return (
      <View style={styles.statsTable}>
        <View style={styles.statsRow}>
          <Text style={styles.statsHeader}></Text>
          <Text style={styles.statsHeader}>{t('diapers.generalCount')}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.today')}</Text>
          <Text style={styles.statsValue}>{dailyCountStats.today}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.yesterday')}</Text>
          <Text style={styles.statsValue}>{dailyCountStats.yesterday}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.last7Days')}</Text>
          <Text style={styles.statsValue}>{dailyCountStats.lastPeriod}</Text>
        </View>
      </View>
    );
  };

  const renderDailyStats = () => {
    return (
      <View style={styles.statsTable}>
        <View style={styles.statsRow}>
          <Text style={styles.statsHeader}></Text>
          <Text style={styles.statsHeader}>{t('diapers.dur')}</Text>
          <Text style={styles.statsHeader}>{t('diapers.mou')}</Text>
          <Text style={styles.statsHeader}>{t('diapers.liquide')}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.today')}</Text>
          <Text style={styles.statsValue}>{(dailyStats.today as any)[0]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.today as any)[1]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.today as any)[2]}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.yesterday')}</Text>
          <Text style={styles.statsValue}>{(dailyStats.yesterday as any)[0]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.yesterday as any)[1]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.yesterday as any)[2]}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>{t('diapers.last7Days')}</Text>
          <Text style={styles.statsValue}>{(dailyStats.lastPeriod as any)[0]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.lastPeriod as any)[1]}</Text>
          <Text style={styles.statsValue}>{(dailyStats.lastPeriod as any)[2]}</Text>
        </View>
      </View>
    );
  };

  const renderContentStats = () => {
    return (
      <View style={styles.contentStatsContainer}>
        <View style={styles.contentStatsRow}>
          <View style={styles.contentColumn}>
            <Text style={styles.contentLabel}></Text>
            <Text style={styles.statsLabel}>{t('diapers.today')}</Text>
            <Text style={styles.statsLabel}>{t('diapers.yesterday')}</Text>
            <Text style={styles.statsLabel}>{t('diapers.last7Days')}</Text>
          </View>
          <View style={styles.contentColumn}>
            <Text style={styles.contentEmoji}>💦</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.today as any)[0]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.yesterday as any)[0]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.lastPeriod as any)[0]}</Text>
          </View>
          <View style={styles.contentColumn}>
            <Text style={styles.contentEmoji}>💩</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.today as any)[1]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.yesterday as any)[1]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.lastPeriod as any)[1]}</Text>
          </View>
          <View style={styles.contentColumn}>
            <Text style={styles.contentEmoji}>💦💩</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.today as any)[2]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.yesterday as any)[2]}</Text>
            <Text style={styles.statsValue}>{(dailyContentStats.lastPeriod as any)[2]}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('diapers.noTaskFound')}
    >
      {/* Last Task */}
      {lastTask && (
        <View style={styles.section}>
          <SectionTitle>{t('diapers.lastTask')}</SectionTitle>
          <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
        </View>
      )}

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'count' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('count')}
        >
          <Text style={[styles.tabText, selectedTab === 'count' && styles.tabTextActive]}>
            {t('diapers.generalCount')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'type' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('type')}
        >
          <Text style={[styles.tabText, selectedTab === 'type' && styles.tabTextActive]}>
            {t('diapers.typeStats')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'content' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('content')}
        >
          <Text style={[styles.tabText, selectedTab === 'content' && styles.tabTextActive]}>
            {t('diapers.contentStats')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* General Count Tab */}
      {selectedTab === 'count' && (
        <>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.someFigures')}</SectionTitle>
            {renderCountStats()}
          </View>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.last7DaysStacked')}</SectionTitle>
            {(countChartData.datasets[0].data as any).length > 0 && (
              <BarChart
                data={countChartData}
                width={Dimensions.get('window').width - 40}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#FFF',
                  backgroundGradientFrom: '#FFF',
                  backgroundGradientTo: '#FFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(199, 91, 74, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(122, 136, 137, ${opacity})`,
                  barPercentage: 0.7,
                  style: { borderRadius: 16 }
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
                showValuesOnTopOfBars={true}
                fromZero={true}
              />
            )}
          </View>
        </>
      )}

      {/* Type Tab */}
      {selectedTab === 'type' && (
        <>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.someFigures')}</SectionTitle>
            {renderDailyStats()}
          </View>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.last7DaysStacked')}</SectionTitle>
            <StackedBarChart
              labels={(chartData as any).labels}
              data={(chartData as any).data}
              barColors={(chartData as any).barColors}
              legend={[t('diapers.dur'), t('diapers.mou'), t('diapers.liquide')]}
            />
          </View>
        </>
      )}

      {/* Content Tab */}
      {selectedTab === 'content' && (
        <>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.content')}</SectionTitle>
            {renderContentStats()}
          </View>
          <View style={styles.section}>
            <SectionTitle>{t('diapers.last7DaysStacked')}</SectionTitle>
            <StackedBarChart
              labels={(contentChartData as any).labels}
              data={(contentChartData as any).data}
              barColors={(contentChartData as any).barColors}
              legend={[
                `💦 ${t('diapers.pee')}`,
                `💩 ${t('diapers.poop')}`,
                `💦💩 ${t('diapers.both')}`,
              ]}
            />
          </View>
        </>
      )}
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: 4,
    marginBottom: STATS_CONFIG.SPACING.LARGE,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#C75B4A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8889',
  },
  tabTextActive: {
    color: '#FFF',
  },
  statsTable: {
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: STATS_CONFIG.SPACING.MEDIUM,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: STATS_CONFIG.SPACING.SMALL,
  },
  statsHeader: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    flex: 1,
    textAlign: 'center',
  },
  statsLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  statsValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  contentStatsContainer: {
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: STATS_CONFIG.SPACING.MEDIUM,
  },
  contentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contentColumn: {
    alignItems: 'center',
    flex: 1,
  },
  contentEmoji: {
    fontSize: 18,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  contentLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: 'bold',
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
});

export default Diaper;
