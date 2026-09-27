import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAllaitementStats, useAllaitementCountStats, usePumpingStats } from '../hooks/useTaskStatistics';
import { usePremium } from '../Context/PremiumContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import { STATS_CONFIG } from '../constants/statsConfig';
import Analytics from '../services/analytics';

type ViewMode = 'duration' | 'count' | 'pumping';

const Allaitement = ({ navigation, tasks }: { navigation: any; tasks: Task[] }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('count');
  const [selectedItem, setSelectedItem] = useState(0);

  const enterTimeRef = useRef(Date.now());
  const tabEnterTimeRef = useRef(Date.now());

  useEffect(() => {
    Analytics.logScreenView('StatsAllaitement');
    enterTimeRef.current = Date.now();
    tabEnterTimeRef.current = Date.now();
    return () => {
      Analytics.logEvent('stats_time_spent', {
        screen: 'Allaitement',
        duration_sec: Math.round((Date.now() - enterTimeRef.current) / 1000),
      });
    };
  }, []);

  const { isPremium } = usePremium();
  const durationStats = useAllaitementStats(tasks);
  const countStats = useAllaitementCountStats(tasks);
  const pumping = usePumpingStats(tasks);
  const { dailyStats, chartData, lastTask, isLoading, error } =
    viewMode === 'duration' ? durationStats : countStats;

  const fmtMl = (v: number) => `${v} ${t('ml')}`;

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
      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('allaitement.someFigures')}</Text>

        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            onPress={() => {
              const dur = Math.round((Date.now() - tabEnterTimeRef.current) / 1000);
              Analytics.logEvent('stats_tab_time_spent', { screen: 'Allaitement', tab: viewMode, duration_sec: dur });
              tabEnterTimeRef.current = Date.now();
              setViewMode('count');
              Analytics.logEvent('tab_selected', { screen: 'Allaitement', tab: 'count' });
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
              Analytics.logEvent('stats_tab_time_spent', { screen: 'Allaitement', tab: viewMode, duration_sec: dur });
              tabEnterTimeRef.current = Date.now();
              setViewMode('duration');
              Analytics.logEvent('tab_selected', { screen: 'Allaitement', tab: 'duration' });
            }}
            style={[styles.viewModeButton, viewMode === 'duration' && styles.viewModeButtonActive]}
          >
            <Text style={[styles.viewModeText, viewMode === 'duration' && styles.viewModeTextActive]}>
              {t('stats.duration')}
            </Text>
          </TouchableOpacity>
          {pumping.hasData && (
            <TouchableOpacity
              onPress={() => {
                const dur = Math.round((Date.now() - tabEnterTimeRef.current) / 1000);
                Analytics.logEvent('stats_tab_time_spent', { screen: 'Allaitement', tab: viewMode, duration_sec: dur });
                tabEnterTimeRef.current = Date.now();
                setViewMode('pumping');
                Analytics.logEvent('tab_selected', { screen: 'Allaitement', tab: 'pumping' });
              }}
              style={[styles.viewModeButton, viewMode === 'pumping' && styles.viewModeButtonActive]}
            >
              <Text style={[styles.viewModeText, viewMode === 'pumping' && styles.viewModeTextActive]}>
                {t('breastfeeding.pumpingTab')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {viewMode === 'pumping' ? (
          <View>
            {/* Gratuit : ce que l'utilisatrice a saisi elle-même.
                On ne fait pas payer quelqu'un pour relire ses propres données. */}
            <View style={styles.statsRow}>
              <View style={styles.statsColumn}>
                <Text style={styles.statLabel}>{t('breastfeeding.pumpTotal')}</Text>
                <Text style={styles.statLabel}>{t('breastfeeding.pumpAverage')}</Text>
                <Text style={styles.statLabel}>{t('breastfeeding.pumpPerDay')}</Text>
              </View>
              <View style={styles.statsColumn}>
                <Text style={styles.statValue}>{fmtMl(pumping.totalMl)}</Text>
                <Text style={styles.statValue}>{fmtMl(pumping.avgMl)}</Text>
                <Text style={styles.statValue}>{fmtMl(pumping.avgPerDay)}</Text>
              </View>
            </View>

            {/* Premium : l'analyse croisée, pas la donnée brute. */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHead}>
                <Text style={styles.balanceTitle}>{t('breastfeeding.balanceTitle')}</Text>
                {!isPremium && <Text style={styles.balanceStar}>★</Text>}
              </View>

              {isPremium ? (
                <View>
                  {([['7', pumping.last7], ['30', pumping.last30]] as const).map(([days, w]) => (
                    <View key={days} style={styles.balanceRow}>
                      <Text style={styles.balancePeriod}>{t('breastfeeding.balanceDays', { count: Number(days) })}</Text>
                      <View style={styles.balanceNums}>
                        <Text style={styles.balanceSmall}>
                          {t('breastfeeding.balancePumped')} {fmtMl(w.pumpedMl)}
                        </Text>
                        <Text style={styles.balanceSmall}>
                          {t('breastfeeding.balanceDrunk')} {fmtMl(w.maternalMl)}
                        </Text>
                        <Text style={[styles.balanceValue, { color: w.balance >= 0 ? '#2C6E49' : '#C75B4A' }]}>
                          {w.balance >= 0 ? '+' : ''}{fmtMl(w.balance)}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <Text style={styles.balanceNote}>{t('breastfeeding.balanceNote')}</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.balanceLocked}>{t('breastfeeding.balanceUpsell')}</Text>
                  <TouchableOpacity
                    style={styles.balanceCta}
                    onPress={() => {
                      Analytics.logEvent('paywall_opened', { source: 'pumping_balance' });
                      navigation.navigate('Paywall');
                    }}
                    activeOpacity={0.9}
                  >
                    <MaterialCommunityIcons name="star" size={15} color="#FFF" />
                    <Text style={styles.balanceCtaTxt}>{t('premium.cta_short')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
        <>
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
        </>
        )}
      </View>

      {/* Chart — sans objet en vue tire-lait, qui a ses propres chiffres */}
      {viewMode !== 'pumping' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('allaitement.evolutionLast7Days')}</Text>
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
      )}
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 18,
    borderWidth: 1, borderColor: '#EFE3DB',
  },
  balanceHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  balanceTitle: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  balanceStar: { fontSize: 15, color: '#E8960A', fontWeight: '700' },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F2EAE4',
  },
  balancePeriod: { fontSize: 14, fontWeight: '600', color: '#7A8889' },
  balanceNums: { alignItems: 'flex-end', gap: 2 },
  balanceSmall: { fontSize: 12, color: '#9AA3A4' },
  balanceValue: { fontSize: 19, fontWeight: '700', marginTop: 2 },
  balanceNote: { fontSize: 11.5, color: '#9AA3A4', marginTop: 12, lineHeight: 16 },
  balanceLocked: { fontSize: 14, color: '#7A8889', lineHeight: 20, marginBottom: 14 },
  balanceCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#C75B4A', borderRadius: 10, paddingVertical: 11,
  },
  balanceCtaTxt: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
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
