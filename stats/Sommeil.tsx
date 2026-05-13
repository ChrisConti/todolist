import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSommeilStats, useSommeilCountStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SleepAdvancedTab from '../components/stats/SleepAdvancedTab';
import { STATS_CONFIG } from '../constants/statsConfig';
import Analytics from '../services/analytics';

interface SommeilProps {
  navigation: any;
  tasks: Task[];
  babyName?: string;
  babyBirthDate?: string;
  userId?: string;
}

type ViewMode = 'duration' | 'count';

const Sommeil: React.FC<SommeilProps> = ({ navigation, tasks, babyName, babyBirthDate, userId }) => {
  const { t } = useTranslation();
  const [mainTab, setMainTab] = useState<'global' | 'advanced'>('global');
  const [viewMode, setViewMode] = useState<ViewMode>('count');
  const enterTimeRef = useRef(Date.now());
  const tabEnterTimeRef = useRef(Date.now());

  useEffect(() => {
    Analytics.logScreenView('StatsSommeil');
    enterTimeRef.current = Date.now();
    tabEnterTimeRef.current = Date.now();
    return () => {
      Analytics.logEvent('stats_time_spent', {
        screen: 'Sommeil',
        duration_sec: Math.round((Date.now() - enterTimeRef.current) / 1000),
      });
    };
  }, []);

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

  const renderChart = () => {
    const sommeilChartData = chartData as import('../types/stats').ChartData;
    const dataValues = sommeilChartData.datasets[0].data as number[];
    const maxValue = Math.max(...dataValues);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartContent}>
          {chartData.labels.map((label, index) => {
            const value = dataValues[index];
            const isEmpty = value === 0;
            const barHeight = isEmpty ? 0 : (value / maxValue) * STATS_CONFIG.BAR_MAX_HEIGHT * 1.5;
            const isMax = value === maxValue;
            return (
              <View key={index} style={styles.chartColumn}>
                {viewMode === 'duration' && !isEmpty && (
                  <Text style={styles.barLabelAbove}>{formatDuration(value)}</Text>
                )}
                {!isEmpty && (
                  <View style={[styles.bar, {
                    height: barHeight,
                    backgroundColor: STATS_CONFIG.COLORS.SLEEP,
                    opacity: isMax ? STATS_CONFIG.BAR_OPACITY_MAX : STATS_CONFIG.BAR_OPACITY_NON_MAX,
                  }]}>
                    {viewMode === 'count' && (
                      <Text style={styles.barValue}>{value}</Text>
                    )}
                  </View>
                )}
                <Text style={styles.chartLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const formatValue = (value: number) => {
    return viewMode === 'duration' ? formatDuration(value) : `${value}`;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Main tab selector */}
      <View style={styles.mainTabRow}>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'global' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('global')}
        >
          <Text style={[styles.mainTabTxt, mainTab === 'global' && styles.mainTabTxtActive]}>
            {t('sleepAdvanced.tabGlobal')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'advanced' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('advanced')}
        >
          <Text style={[styles.mainTabTxt, mainTab === 'advanced' && styles.mainTabTxtActive]}>
            {t('sleepAdvanced.tabAdvanced')}
          </Text>
        </TouchableOpacity>
      </View>

      {mainTab === 'advanced' ? (
        <SleepAdvancedTab
          tasks={tasks}
          babyName={babyName}
          babyBirthDate={babyBirthDate}
          userId={userId}
        />
      ) : (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('sommeil.noTaskFound')}
    >
      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sommeil.someFigures')}</Text>

        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            onPress={() => {
              const dur = Math.round((Date.now() - tabEnterTimeRef.current) / 1000);
              Analytics.logEvent('stats_tab_time_spent', { screen: 'Sommeil', tab: viewMode, duration_sec: dur });
              tabEnterTimeRef.current = Date.now();
              setViewMode('count');
              Analytics.logEvent('tab_selected', { screen: 'Sommeil', tab: 'count' });
            }}
            style={[styles.viewModeButton, viewMode === 'count' && styles.viewModeButtonActive]}
          >
            <Text style={[styles.viewModeText, viewMode === 'count' && styles.viewModeTextActive]}>
              {t('stats.count')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const dur = Math.round((Date.now() - tabEnterTimeRef.current) / 1000);
              Analytics.logEvent('stats_tab_time_spent', { screen: 'Sommeil', tab: viewMode, duration_sec: dur });
              tabEnterTimeRef.current = Date.now();
              setViewMode('duration');
              Analytics.logEvent('tab_selected', { screen: 'Sommeil', tab: 'duration' });
            }}
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
        <Text style={styles.sectionTitle}>{t('sommeil.evolutionLast7Days')}</Text>
        {renderChart()}
      </View>
    </StatsContainer>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainTabRow:       { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, padding: 3, margin: 12, marginBottom: 0, gap: 3 },
  mainTabBtn:       { flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center' },
  mainTabBtnActive: { backgroundColor: '#4F469F' },
  mainTabTxt:       { fontSize: 14, fontWeight: '600', color: '#7A8889' },
  mainTabTxtActive: { color: '#FFF' },
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
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
    height: 220,
    marginVertical: STATS_CONFIG.SPACING.LARGE + 8,
    borderRadius: 16,
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    paddingVertical: STATS_CONFIG.SPACING.MEDIUM,
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
  barLabelAbove: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: '600',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  barValue: {
    color: STATS_CONFIG.COLORS.WHITE,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
  },
});

export default Sommeil;
