import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { usePremium } from '../Context/PremiumContext';
import Analytics from '../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { Task } from '../types/stats';
import { STATS_CONFIG, TASK_TYPES } from '../constants/statsConfig';
import StatsContainer from '../components/stats/StatsContainer';
import { getSleepMinutesForPeriod } from '../hooks/useTaskStatistics';

import BiberonIcon from '../assets/biberon-color.svg';
import AllaitementIcon from '../assets/allaitement-color.svg';
import DodoIcon from '../assets/dodo-color.svg';
import CoucheIcon from '../assets/couche-color.svg';
import ThermoIcon from '../assets/thermo-color.svg';

interface AllStatsProps {
  navigation: any;
  tasks: Task[];
}

interface CategoryStats {
  count: number;
  quantity?: number;
  leftCount?: number;
  leftDuration?: number;
  rightCount?: number;
  rightDuration?: number;
  minTemp?: number;
  maxTemp?: number;
}

interface PeriodStats {
  biberon: CategoryStats;
  allaitement: CategoryStats;
  sommeil: CategoryStats;
  couche: CategoryStats;
  temperature: CategoryStats;
}

type CategoryKey = 'biberon' | 'allaitement' | 'sommeil' | 'couche' | 'temperature';

const GAP = 12;
const H_PAD = 8;

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
};

const formatDurationShort = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
};

const formatQuantity = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}L`;
  return `${Math.round(value)}ml`;
};

const getRowValues = (
  category: CategoryKey,
  stats: CategoryStats,
): [string, string] => {
  switch (category) {
    case 'biberon':
      if (stats.count === 0) return ['–', ''];
      return [
        `${stats.count}`,
        stats.quantity != null && stats.quantity > 0 ? formatQuantity(stats.quantity) : '',
      ];
    case 'allaitement': {
      if (stats.count === 0) return ['–', '–'];
      const ld = stats.leftDuration ?? 0;
      const rd = stats.rightDuration ?? 0;
      return [
        ld > 0 ? formatDurationShort(ld) : '–',
        rd > 0 ? formatDurationShort(rd) : '–',
      ];
    }
    case 'sommeil':
      if (stats.count === 0) return ['–', ''];
      return [
        `${stats.count}`,
        stats.quantity != null && stats.quantity > 0 ? formatDuration(stats.quantity) : '',
      ];
    case 'couche':
      return [stats.count > 0 ? `${stats.count}` : '–', ''];
    case 'temperature':
      if (stats.count === 0) return ['–', ''];
      return [
        `↓${stats.minTemp!.toFixed(1)}°`,
        `↑${stats.maxTemp!.toFixed(1)}°`,
      ];
  }
};

const PREMIUM_CATEGORIES = new Set(['biberon', 'sommeil']);

const AllStats: React.FC<AllStatsProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();

  const calculatePeriodStats = (startDate: moment.Moment, endDate: moment.Moment): PeriodStats => {
    const stats: PeriodStats = {
      biberon: { count: 0, quantity: 0 },
      allaitement: { count: 0, leftCount: 0, leftDuration: 0, rightCount: 0, rightDuration: 0 },
      sommeil: { count: 0, quantity: 0 },
      couche: { count: 0 },
      temperature: { count: 0 },
    };

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');

      if (task.id === TASK_TYPES.SLEEP) {
        const sleepDuration = parseInt(task.label || '0');
        if (isNaN(sleepDuration) || sleepDuration <= 0) return;
        const sessionEnd = taskDate.clone().add(sleepDuration, 'minutes');
        if (taskDate.isBefore(endDate) && sessionEnd.isAfter(startDate)) {
          stats.sommeil.count++;
          stats.sommeil.quantity! += getSleepMinutesForPeriod(taskDate, sleepDuration, startDate, endDate);
        }
        return;
      }

      if (!taskDate.isBetween(startDate, endDate, undefined, '[]')) return;

      switch (task.id) {
        case TASK_TYPES.BIBERON: {
          stats.biberon.count++;
          const qty = parseFloat(task.label);
          if (!isNaN(qty)) stats.biberon.quantity! += qty;
          break;
        }
        case TASK_TYPES.BREASTFEEDING: {
          stats.allaitement.count++;
          const leftSec = typeof task.boobLeft === 'number' ? task.boobLeft : parseFloat(String(task.boobLeft || '0'));
          const rightSec = typeof task.boobRight === 'number' ? task.boobRight : parseFloat(String(task.boobRight || '0'));
          const leftMin = Math.round(leftSec / 60);
          const rightMin = Math.round(rightSec / 60);
          if (leftMin > 0) { stats.allaitement.leftCount!++; stats.allaitement.leftDuration! += leftMin; }
          if (rightMin > 0) { stats.allaitement.rightCount!++; stats.allaitement.rightDuration! += rightMin; }
          break;
        }
        case TASK_TYPES.DIAPER:
          stats.couche.count++;
          break;
        case TASK_TYPES.TEMPERATURE: {
          const temp = parseFloat(String(task.label).replace(',', '.'));
          if (isNaN(temp) || temp <= 0) break;
          stats.temperature.count++;
          if (stats.temperature.minTemp === undefined || temp < stats.temperature.minTemp) stats.temperature.minTemp = temp;
          if (stats.temperature.maxTemp === undefined || temp > stats.temperature.maxTemp) stats.temperature.maxTemp = temp;
          break;
        }
      }
    });

    return stats;
  };

  const { todayStats, yesterdayStats, last7DaysStats } = useMemo(() => {
    const now = moment();
    const todayStart = now.clone().startOf('day');
    const todayEnd = now.clone().endOf('day');
    const yesterdayStart = now.clone().subtract(1, 'day').startOf('day');
    const yesterdayEnd = now.clone().subtract(1, 'day').endOf('day');
    const last7DaysStart = now.clone().subtract(6, 'days').startOf('day');
    return {
      todayStats: calculatePeriodStats(todayStart, todayEnd),
      yesterdayStats: calculatePeriodStats(yesterdayStart, yesterdayEnd),
      last7DaysStats: calculatePeriodStats(last7DaysStart, todayEnd),
    };
  }, [tasks]);

  const totalCount = (ps: PeriodStats) =>
    ps.biberon.count + ps.allaitement.count + ps.sommeil.count + ps.couche.count + ps.temperature.count;

  const navTo = (category: string) => {
    Analytics.logEvent('stats_category_tapped', { category });
    if (category === 'biberon') return navigation.navigate('BiberonInsights');
    const idMap: Record<string, number> = { allaitement: 5, sommeil: 3, couche: 1, temperature: 4 };
    navigation.navigate('CategoryDetail', { categoryId: idMap[category] });
  };

  const renderCard = (
    Icon: React.ComponentType<{ width: number; height: number }>,
    color: string,
    category: CategoryKey,
  ) => {
    const rows = [
      { label: `${t('stats.overview.today')}:`, stats: todayStats[category] },
      { label: `${t('stats.overview.yesterday')}:`, stats: yesterdayStats[category] },
      { label: `${t('stats.overview.week')}:`, stats: last7DaysStats[category] },
    ];

    return (
      <TouchableOpacity
        key={category}
        style={[styles.card, { backgroundColor: color }]}
        onPress={() => navTo(category)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconBadge}>
            <Icon width={22} height={22} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!isPremium && PREMIUM_CATEGORIES.has(category) && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeTxt}>★</Text>
              </View>
            )}
            <View style={styles.chevronCircle}>
              <MaterialCommunityIcons name="chevron-right" size={14} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>
        <View style={styles.cardBody}>
          {rows.map((row, i) => {
            const [v1, v2] = getRowValues(category, row.stats);
            return (
              <View key={i} style={styles.dataRow}>
                <Text style={styles.dataLabel} allowFontScaling={false}>{row.label}</Text>
                <Text style={styles.dataVal1} allowFontScaling={false}>{v1}</Text>
                {v2 !== '' ? (
                  <Text style={styles.dataVal2} allowFontScaling={false}>{v2}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <StatsContainer loading={false} error={null} hasData={tasks.length > 0} emptyMessage={t('stats.noData')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('title.activities')}</Text>
          <View style={styles.summaryRow}>
            {[
              { count: totalCount(todayStats), label: t('stats.overview.today') },
              { count: totalCount(yesterdayStats), label: t('stats.overview.yesterday') },
              { count: totalCount(last7DaysStats), label: t('stats.overview.week') },
            ].map((item, i) => (
              <View key={i} style={styles.summaryCol}>
                <Text style={styles.summaryCount}>{item.count}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category grid */}
        <View style={styles.row}>
          {renderCard(BiberonIcon as any, STATS_CONFIG.COLORS.BIBERON, 'biberon')}
          <View style={styles.rowSpacer} />
          {renderCard(AllaitementIcon as any, STATS_CONFIG.COLORS.BREASTFEEDING, 'allaitement')}
        </View>
        <View style={styles.row}>
          {renderCard(DodoIcon as any, STATS_CONFIG.COLORS.SLEEP, 'sommeil')}
          <View style={styles.rowSpacer} />
          {renderCard(CoucheIcon as any, STATS_CONFIG.COLORS.DIAPER, 'couche')}
        </View>
        <View style={styles.row}>
          {renderCard(ThermoIcon as any, STATS_CONFIG.COLORS.TEMPERATURE, 'temperature')}
          <View style={styles.rowSpacer} />

          {/* Export card */}
          <TouchableOpacity
            style={[styles.card, styles.exportCard]}
            onPress={() => { Analytics.logEvent('stats_export_tapped'); navigation.navigate('ExportTasks'); }}
            activeOpacity={0.8}
          >
            {!isPremium && (
              <View style={[styles.premiumBadge, { position: 'absolute', top: 10, right: 10 }]}>
                <Text style={styles.premiumBadgeTxt}>★</Text>
              </View>
            )}
            <MaterialCommunityIcons name="arrow-down-circle" size={38} color="#FFF" />
            <Text style={styles.exportTitle} allowFontScaling={false}>{t('stats.overview.export')}</Text>
            <View style={styles.exportBadge}>
              <Text style={styles.exportBadgeText} allowFontScaling={false}>CSV</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Summary card */
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: H_PAD,
    marginBottom: GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 17,
    color: '#C75B4A',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#2D2D2D',
    lineHeight: 40,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ADADAD',
    fontWeight: '500',
    marginTop: 2,
  },

  /* Category grid */
  row: {
    flexDirection: 'row',
    marginHorizontal: H_PAD,
    marginBottom: GAP,
  },
  rowSpacer: {
    width: GAP,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dataLabel: {
    width: 30,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  dataVal1: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'right',
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  premiumBadgeTxt: { fontSize: 10, color: '#FFF', fontWeight: '700' },

  /* largeur fixée pour tenir xxhxx (ex: 4h53) sans jamais s'adapter */
  dataVal2: {
    width: 52,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'right',
  },

  /* Export card */
  exportCard: {
    backgroundColor: '#4A7FC1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  exportBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  exportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
});

export default AllStats;
