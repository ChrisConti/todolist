import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useSommeilStats, useSommeilCountStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SectionTitle from '../components/stats/SectionTitle';
import { STATS_CONFIG } from '../constants/statsConfig';

interface SommeilProps {
  navigation: any;
  tasks: Task[];
}

type ViewMode = 'duration' | 'count';

const Sommeil: React.FC<SommeilProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('count');

  const durationStats = useSommeilStats(tasks);
  const countStats = useSommeilCountStats(tasks);
  const { dailyStats, chartData, lastTask, isLoading, error } = viewMode === 'duration' ? durationStats : countStats;

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
    const barHeight = (value / maxValue) * STATS_CONFIG.BAR_MAX_HEIGHT * 1.5;
    return (
      <View style={[styles.bar, {
        height: barHeight,
        backgroundColor: color,
        opacity: isMax ? STATS_CONFIG.BAR_OPACITY_MAX : STATS_CONFIG.BAR_OPACITY_NON_MAX
      }]}>
        {viewMode === 'count' && value > 0 && (
          <Text style={styles.barValue}>{value}</Text>
        )}
      </View>
    );
  };

  const renderChart = () => {
    const sommeilChartData = chartData as import('../types/stats').ChartData;
    const dataValues = sommeilChartData.datasets[0].data as number[];
    const maxValue = Math.max(...dataValues);

    // Format Y-axis labels based on view mode (only show in duration mode)
    const yAxisLabels = viewMode === 'duration'
      ? [maxValue, maxValue / 2, 0].map(formatDuration)
      : [];

    return (
      <View style={styles.chartContainer}>
        {viewMode === 'duration' && (
          <View style={styles.yAxis}>
            {yAxisLabels.map((label, index) => (
              <Text key={index} style={styles.yAxisLabel}>{label}</Text>
            ))}
          </View>
        )}
        <View style={styles.chartContent}>
          {chartData.labels.map((label, index) => (
            <View key={index} style={styles.chartColumn}>
              {renderBar(dataValues[index], maxValue, STATS_CONFIG.COLORS.SLEEP, dataValues[index] === maxValue)}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const formatValue = (value: number) => {
    return viewMode === 'duration' ? formatDuration(value) : `${value}`;
  };

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('sommeil.noTaskFound')}
    >
      {/* Last Task */}
      {lastTask && (
        <View style={styles.section}>
          <SectionTitle>{t('sommeil.lastTask')}</SectionTitle>
          <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <SectionTitle>{t('sommeil.someFigures')}</SectionTitle>

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

        {/* Stats Values */}
        <View style={styles.statsRow}>
          <View style={styles.statsColumn}>
            <Text style={styles.statLabel}>{t('sommeil.today')}</Text>
            <Text style={styles.statLabel}>{t('sommeil.yesterday')}</Text>
            <Text style={styles.statLabel}>{t('sommeil.last7Days')}</Text>
          </View>
          <View style={styles.statsColumn}>
            <Text style={styles.statValue}>{formatValue(dailyStats.today as number)}</Text>
            <Text style={styles.statValue}>{formatValue(dailyStats.yesterday as number)}</Text>
            <Text style={styles.statValue}>{formatValue(dailyStats.lastPeriod as number)}</Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <SectionTitle>{t('sommeil.evolutionLast7Days')}</SectionTitle>
        {renderChart()}
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
    backgroundColor: STATS_CONFIG.COLORS.SLEEP,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8889',
  },
  viewModeTextActive: {
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
    height: 220,
    marginVertical: STATS_CONFIG.SPACING.LARGE + 8,
    borderRadius: 16,
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    paddingVertical: STATS_CONFIG.SPACING.MEDIUM,
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 8,
    paddingLeft: STATS_CONFIG.SPACING.SMALL,
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
  chartLabel: {
    marginTop: STATS_CONFIG.SPACING.SMALL,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  bar: {
    width: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  barValue: {
    color: STATS_CONFIG.COLORS.WHITE,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
  },
});

export default Sommeil;
