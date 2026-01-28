import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useAllaitementStats, useAllaitementCountStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SectionTitle from '../components/stats/SectionTitle';
import { STATS_CONFIG } from '../constants/statsConfig';

type ViewMode = 'duration' | 'count';

const Allaitement = ({ navigation, tasks }: { navigation: any; tasks: Task[] }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('count');
  const [selectedItem, setSelectedItem] = useState(0);

  const durationStats = useAllaitementStats(tasks);
  const countStats = useAllaitementCountStats(tasks);
  const { dailyStats, chartData, lastTask, isLoading, error } = viewMode === 'duration' ? durationStats : countStats;

  const boobSide = [
    { id: 0, side: t('allaitement.left'), name: t('allaitement.left'), nameTrad: 0 },
    { id: 1, side: t('allaitement.right'), name: t('allaitement.right'), nameTrad: 1 },
    { id: 2, side: t('allaitement.both'), name: t('allaitement.both'), nameTrad: 2 },
  ];

  const formatValue = (value: number) => {
    if (viewMode === 'count') {
      return `${value}`;
    }
    return value > 60 ? `${(value / 60).toFixed(1)} h` : `${value.toFixed(0)} min`;
  };

  const formatDuration = (minutes: number) => {
    return minutes > 60 ? `${(minutes / 60).toFixed(1)} h` : `${minutes.toFixed(0)} min`;
  };

  const getStatsForSide = (stats: any, side: number) => {
    if (side === 0) return stats.boobLeft;
    if (side === 1) return stats.boobRight;
    return stats.total;
  };

  const renderBarChart = () => {
    const allaitementChartData = chartData as any;
    const maxValue = Math.max(...allaitementChartData.total.filter((v: any) => typeof v === 'number'));
    const chartHeight = 150;
    const barWidth = 20;

    return (
      <View style={styles.chartContainer}>
        {viewMode === 'duration' && (
          <View style={styles.yAxis}>
            {[maxValue, maxValue / 2, 0].map((value, index) => (
              <Text key={index} style={styles.yAxisLabel}>
                {formatDuration(value)}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.chartContent}>
          {allaitementChartData.labels.map((label: string, index: number) => (
            <View key={index} style={styles.chartColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (allaitementChartData.boobLeft[index] / maxValue) * chartHeight || 1,
                      backgroundColor: STATS_CONFIG.COLORS.BREASTFEEDING_LEFT,
                      width: barWidth,
                    },
                  ]}
                >
                  {viewMode === 'count' && allaitementChartData.boobLeft[index] > 0 && (
                    <Text style={styles.barValue}>{Math.round(allaitementChartData.boobLeft[index])}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (allaitementChartData.boobRight[index] / maxValue) * chartHeight || 1,
                      backgroundColor: STATS_CONFIG.COLORS.SLEEP,
                      width: barWidth,
                    },
                  ]}
                >
                  {viewMode === 'count' && allaitementChartData.boobRight[index] > 0 && (
                    <Text style={styles.barValue}>{Math.round(allaitementChartData.boobRight[index])}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('allaitement.noTaskFound')}
    >
      {/* Last Task */}
      {lastTask && (
        <View style={styles.section}>
          <SectionTitle>{t('allaitement.lastTask')}</SectionTitle>
          <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <SectionTitle>{t('allaitement.someFigures')}</SectionTitle>

        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            onPress={() => setViewMode('count')}
            style={[styles.viewModeButton, viewMode === 'count' && styles.viewModeButtonActive]}
          >
            <Text style={[styles.viewModeText, viewMode === 'count' && styles.viewModeTextActive]}>
              {t('stats.count')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('duration')}
            style={[styles.viewModeButton, viewMode === 'duration' && styles.viewModeButtonActive]}
          >
            <Text style={[styles.viewModeText, viewMode === 'duration' && styles.viewModeTextActive]}>
              {t('stats.duration')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Side Selector */}
        <View style={styles.selectorContainer}>
          {boobSide.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedItem(item.id)}
              style={[styles.selectorButton, selectedItem === item.id && styles.selectorButtonActive]}
            >
              <Text style={[styles.selectorText, selectedItem === item.id && styles.selectorTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Values */}
        <View style={styles.statsRow}>
          <View style={styles.statsColumn}>
            <Text style={styles.statLabel}>{t('allaitement.today')}</Text>
            <Text style={styles.statLabel}>{t('allaitement.yesterday')}</Text>
            <Text style={styles.statLabel}>{t('allaitement.last7Days')}</Text>
          </View>
          <View style={styles.statsColumn}>
            <Text style={styles.statValue}>
              {formatValue(getStatsForSide((dailyStats as any).today, selectedItem))}
            </Text>
            <Text style={styles.statValue}>
              {formatValue(getStatsForSide((dailyStats as any).yesterday, selectedItem))}
            </Text>
            <Text style={styles.statValue}>
              {formatValue(getStatsForSide((dailyStats as any).lastPeriod, selectedItem))}
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <SectionTitle>{t('allaitement.evolutionLast7Days')}</SectionTitle>
        {renderBarChart()}

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATS_CONFIG.COLORS.BREASTFEEDING_LEFT }]} />
            <Text style={styles.legendText}>{t('breast.left')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATS_CONFIG.COLORS.SLEEP }]} />
            <Text style={styles.legendText}>{t('breast.right')}</Text>
          </View>
        </View>
      </View>
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: 4,
    marginBottom: STATS_CONFIG.SPACING.LARGE,
    gap: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  viewModeButtonActive: {
    backgroundColor: STATS_CONFIG.COLORS.BREASTFEEDING_LEFT,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8889',
  },
  viewModeTextActive: {
    color: '#FFF',
  },
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: 4,
    marginBottom: STATS_CONFIG.SPACING.MEDIUM,
    gap: 4,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectorButtonActive: {
    backgroundColor: STATS_CONFIG.COLORS.BREASTFEEDING_LEFT,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8889',
  },
  selectorTextActive: {
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsColumn: {
    gap: STATS_CONFIG.SPACING.SMALL,
  },
  statLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  statValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180,
    marginVertical: STATS_CONFIG.SPACING.LARGE,
    borderRadius: 16,
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    alignItems: 'flex-end',
    paddingBottom: 30,
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: STATS_CONFIG.SPACING.MEDIUM,
    marginLeft: STATS_CONFIG.SPACING.MEDIUM,
    height: 150,
  },
  yAxisLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  barValue: {
    color: STATS_CONFIG.COLORS.WHITE,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL - 2,
    fontWeight: 'bold',
  },
  chartLabel: {
    marginTop: STATS_CONFIG.SPACING.SMALL,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
    gap: STATS_CONFIG.SPACING.LARGE,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 10,
    height: 10,
    marginRight: STATS_CONFIG.SPACING.SMALL,
  },
  legendText: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
});

export default Allaitement;
