import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useBiberonStats, useBiberonCountStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SectionTitle from '../components/stats/SectionTitle';
import BarChart from '../components/stats/charts/BarChart';
import { STATS_CONFIG } from '../constants/statsConfig';

interface BiberonProps {
  navigation: any;
  tasks: Task[];
}

type ViewMode = 'quantity' | 'count';

const Biberon: React.FC<BiberonProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('count');

  const quantityStats = useBiberonStats(tasks);
  const countStats = useBiberonCountStats(tasks);
  const { dailyStats, chartData, lastTask, isLoading, error } = viewMode === 'quantity' ? quantityStats : countStats;

  // Transform chart data for BarChart component
  // useBiberonStats always returns ChartData (not StackedChartData)
  const biberonChartData = chartData as import('../types/stats').ChartData;
  const barChartData = biberonChartData.labels.map((label, index) => ({
    label,
    value: (biberonChartData.datasets[0].data as number[])[index],
  }));

  const formatValue = (value: number) => {
    return viewMode === 'quantity' ? `${value} ${t('ml')}` : `${value}`;
  };

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('biberon.noTaskFound')}
    >
      {/* Last Task */}
      {lastTask && (
        <View style={styles.section}>
          <SectionTitle>{t('biberon.lastTask')}</SectionTitle>
          <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <SectionTitle>{t('biberon.someFigures')}</SectionTitle>

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
            onPress={() => setViewMode('quantity')}
            style={[styles.viewModeButton, viewMode === 'quantity' && styles.viewModeButtonActive]}
          >
            <Text style={[styles.viewModeText, viewMode === 'quantity' && styles.viewModeTextActive]}>
              {t('stats.quantity')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Values */}
        <View style={styles.statsRow}>
          <View style={styles.statsColumn}>
            <Text style={styles.statLabel}>{t('biberon.today')}</Text>
            <Text style={styles.statLabel}>{t('biberon.yesterday')}</Text>
            <Text style={styles.statLabel}>{t('biberon.last7Days')}</Text>
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
        <SectionTitle>{t('biberon.evolutionLast7Days')}</SectionTitle>
        <BarChart
          data={barChartData}
          color={STATS_CONFIG.COLORS.BIBERON}
          showValues={true}
        />
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
    backgroundColor: STATS_CONFIG.COLORS.BIBERON,
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
});

export default Biberon;
