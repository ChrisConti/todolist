import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { STATS_CONFIG } from '../../../constants/statsConfig';
import { Task } from '../../../types/stats';

interface Timeline30DaysProps {
  tasks: Task[];
  viewMode: 'quantity' | 'count';
}

interface DayData {
  date: moment.Moment;
  dateLabel: string;
  total: number;
  count: number;
}

const Timeline30Days: React.FC<Timeline30DaysProps> = ({ tasks, viewMode }) => {
  const { t } = useTranslation();

  const COLOR_PRIMARY = '#34777B';
  const COLOR_SECONDARY = '#E29656';

  // Calculate data for last 30 days
  const daysData = useMemo(() => {
    const days: DayData[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = moment().subtract(i, 'days').startOf('day');
      const dayData: DayData = {
        date,
        dateLabel: date.format('DD'),
        total: 0,
        count: 0,
      };

      tasks.forEach((task) => {
        const taskMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
        if (taskMoment.isSame(date, 'day')) {
          const value = viewMode === 'quantity' ? parseFloat(task.label) : 1;
          if (!isNaN(value) || viewMode === 'count') {
            dayData.total += viewMode === 'quantity' ? value : 1;
            dayData.count += 1;
          }
        }
      });

      days.push(dayData);
    }

    return days;
  }, [tasks, viewMode]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalQuantity = daysData.reduce((sum, day) => sum + day.total, 0);
    const totalCount = daysData.reduce((sum, day) => sum + day.count, 0);
    const avgPerDay = totalCount > 0 ? totalQuantity / 30 : 0;
    const avgCountPerDay = totalCount / 30;

    // Find best and worst days
    const daysWithData = daysData.filter(d => d.count > 0);
    let bestDay = daysWithData[0];
    let worstDay = daysWithData[0];

    daysWithData.forEach(day => {
      if (day.total > (bestDay?.total || 0)) bestDay = day;
      if (day.total < (worstDay?.total || Infinity)) worstDay = day;
    });

    // Calculate regularity (coefficient of variation)
    const values = daysData.map(d => d.total).filter(v => v > 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length || 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length || 0;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 0;

    // Regularity score: lower CV = more regular (0-5 stars)
    let regularityStars = 5;
    if (cv > 0.4) regularityStars = 1;
    else if (cv > 0.3) regularityStars = 2;
    else if (cv > 0.2) regularityStars = 3;
    else if (cv > 0.1) regularityStars = 4;

    return {
      totalQuantity,
      totalCount,
      avgPerDay: avgPerDay.toFixed(0),
      avgCountPerDay: avgCountPerDay.toFixed(1),
      bestDay,
      worstDay,
      regularityStars,
      daysWithData: daysWithData.length,
    };
  }, [daysData]);

  // Render mini bar chart
  const renderMiniBarChart = (data: number[], color: string, label: string) => {
    const maxValue = Math.max(...data, 1);
    const barWidth = 8;
    const chartHeight = 80;

    return (
      <View style={styles.chartSection}>
        <Text style={styles.chartLabel}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
          <View style={styles.miniChart}>
            {data.map((value, index) => {
              const barHeight = (value / maxValue) * chartHeight;
              const isToday = index === data.length - 1;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.miniBar,
                        {
                          height: barHeight || 2,
                          backgroundColor: color,
                          opacity: isToday ? 1 : 0.7,
                        },
                      ]}
                    />
                  </View>
                  {index % 5 === 0 && (
                    <Text style={styles.barLabel}>{daysData[index]?.dateLabel}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const formatValue = (value: number) => {
    return viewMode === 'quantity' ? `${value}ml` : `${value}`;
  };

  const getRegularityText = (stars: number) => {
    if (stars >= 4) return t('stats.excellent');
    if (stars >= 3) return t('stats.good');
    if (stars >= 2) return t('stats.moderate');
    return t('stats.irregular');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Quantity Chart */}
      {renderMiniBarChart(
        daysData.map(d => d.total),
        COLOR_PRIMARY,
        viewMode === 'quantity' ? t('stats.quantityPerDay') : t('stats.countPerDay')
      )}

      {/* Count Chart (only if in quantity mode) */}
      {viewMode === 'quantity' && renderMiniBarChart(
        daysData.map(d => d.count),
        COLOR_SECONDARY,
        t('stats.bottlesPerDay')
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {/* Average per day */}
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>📊 {t('stats.averagePerDay')}</Text>
          <Text style={[styles.statCardValue, { color: COLOR_PRIMARY }]}>
            {formatValue(Number(stats.avgPerDay))}
          </Text>
          <Text style={styles.statCardSub}>
            {stats.avgCountPerDay} {t('biberon.biberon')}/{t('stats.day')}
          </Text>
        </View>

        {/* Total month */}
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>📈 {t('stats.totalMonth')}</Text>
          <Text style={[styles.statCardValue, { color: COLOR_PRIMARY }]}>
            {formatValue(stats.totalQuantity)}
          </Text>
          <Text style={styles.statCardSub}>
            {stats.totalCount} {t('biberon.biberon')}
          </Text>
        </View>

        {/* Regularity */}
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>⭐ {t('stats.regularity')}</Text>
          <Text style={[styles.statCardValue, { color: COLOR_SECONDARY }]}>
            {'⭐'.repeat(stats.regularityStars)}
          </Text>
          <Text style={styles.statCardSub}>
            {getRegularityText(stats.regularityStars)}
          </Text>
        </View>
      </View>

      {/* Best & Worst Days */}
      {stats.bestDay && stats.worstDay && (
        <View style={styles.extremesContainer}>
          <View style={styles.extremeCard}>
            <Text style={styles.extremeLabel}>🔝 {t('stats.bestDay')}</Text>
            <Text style={styles.extremeDate}>
              {stats.bestDay.date.format('DD MMM')}
            </Text>
            <Text style={[styles.extremeValue, { color: COLOR_PRIMARY }]}>
              {formatValue(stats.bestDay.total)}
            </Text>
            <Text style={styles.extremeCount}>
              {stats.bestDay.count} {t('biberon.biberon')}
            </Text>
          </View>

          <View style={styles.extremeCard}>
            <Text style={styles.extremeLabel}>📉 {t('stats.lowestDay')}</Text>
            <Text style={styles.extremeDate}>
              {stats.worstDay.date.format('DD MMM')}
            </Text>
            <Text style={[styles.extremeValue, { color: COLOR_SECONDARY }]}>
              {formatValue(stats.worstDay.total)}
            </Text>
            <Text style={styles.extremeCount}>
              {stats.worstDay.count} {t('biberon.biberon')}
            </Text>
          </View>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          📅 {stats.daysWithData} {t('stats.daysWithData')} / 30
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  chartSection: {
    marginBottom: 24,
  },
  chartLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  chartScroll: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barContainer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  miniBar: {
    width: 8,
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  statCardSub: {
    fontSize: 11,
    color: '#888',
  },
  extremesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  extremeCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  extremeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  extremeDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  extremeValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  extremeCount: {
    fontSize: 11,
    color: '#888',
  },
  infoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
});

export default Timeline30Days;
