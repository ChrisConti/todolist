import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSommeilStats, useSommeilCountStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SleepAdvancedTab from '../components/stats/SleepAdvancedTab';
import { STATS_CONFIG } from '../constants/statsConfig';
import Analytics from '../services/analytics';
import { usePremium } from '../Context/PremiumContext';

interface SommeilProps {
  navigation: any;
  tasks: Task[];
  babyName?: string;
  babyBirthDate?: string;
  userId?: string;
}

type ViewMode = 'duration' | 'count';

const Sommeil: React.FC<SommeilProps> = ({ navigation, tasks, babyName, babyBirthDate, userId }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { isPremium } = usePremium();
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
                    backgroundColor: theme.category[3],
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
            {t('sleepAdvanced.tabAdvanced')}{!isPremium ? ' ★' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {mainTab === 'advanced' && !isPremium ? (
        <ScrollView contentContainerStyle={styles.lockedWrap}>
          <View style={styles.lockedIcon}>
            <View style={styles.lockedIconShine} />
            <MaterialCommunityIcons name="star" size={32} color={theme.onGold} />
          </View>
          <Text style={styles.lockedTitle}>{t('premium.advancedSommeil.title')}</Text>
          <Text style={styles.lockedSub}>{t('premium.upsellTitle')}</Text>
          <View style={styles.featList}>
            {([
              { icon: 'heart-pulse',   key: 'premium.advancedSommeil.feat1' },
              { icon: 'grid',          key: 'premium.advancedSommeil.feat2' },
              { icon: 'chart-bar',     key: 'premium.advancedSommeil.feat3' },
              { icon: 'chart-areaspline', key: 'premium.advancedSommeil.feat4' },
            ] as const).map(({ icon, key }) => (
              <View key={key} style={styles.featRow}>
                <View style={styles.featIconWrap}>
                  <MaterialCommunityIcons name={icon as any} size={16} color={theme.categoryAccent[3]} />
                </View>
                <Text style={styles.featText}>{t(key)}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.lockedCta}
            onPress={() => { Analytics.logEvent('paywall_opened', { source: 'sommeil_advanced' }); navigation.navigate('Paywall'); }}
            activeOpacity={0.9}
          >
            <View style={styles.lockedCtaIcon}>
              <View style={styles.lockedCtaIconShine} />
              <MaterialCommunityIcons name="star" size={16} color={theme.onGold} />
            </View>
            <Text style={styles.lockedCtaText}>{t('premium.unlockCta')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.gold} />
          </TouchableOpacity>
        </ScrollView>
      ) : mainTab === 'advanced' ? (
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

const makeStyles = (theme: Theme) => StyleSheet.create({
  mainTabRow:       { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 10, padding: 3, margin: 12, marginBottom: 0, gap: 3 },
  mainTabBtn:       { flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center' },
  mainTabBtnActive: { backgroundColor: theme.category[4] },
  mainTabTxt:       { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  mainTabTxtActive: { color: theme.onPrimary },
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.card,
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
    backgroundColor: theme.category[3],
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  viewModeTextActive: {
    color: theme.onPrimary,
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
    color: theme.text,
  },
  statValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: theme.text,
  },
  chartContainer: {
    height: 220,
    marginVertical: STATS_CONFIG.SPACING.LARGE + 8,
    borderRadius: 16,
    backgroundColor: theme.background,
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
    color: theme.text,
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
    color: theme.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  barValue: {
    color: theme.onPrimary,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
  },

  // Locked advanced view
  lockedWrap: { alignItems: 'center', padding: 24, paddingTop: 36 },
  lockedIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, overflow: 'hidden',
  },
  lockedIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 32,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 18,
  },
  lockedTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 6, textAlign: 'center' },
  lockedSub:   { fontSize: 13, color: theme.textSecondary, marginBottom: 24, textAlign: 'center' },
  featList: { width: '100%', gap: 10, marginBottom: 28 },
  featRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: `${theme.category[3]}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  featText: { fontSize: 14, color: theme.textSecondary, fontWeight: '500', flex: 1 },
  lockedCta: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: theme.gold,
    paddingVertical: 14, paddingHorizontal: 18, width: '100%',
  },
  lockedCtaIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  lockedCtaIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 15,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 8,
  },
  lockedCtaText: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.goldText },
});

export default Sommeil;
