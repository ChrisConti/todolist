import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { Task } from '../types/stats';
import { STATS_CONFIG, TASK_TYPES } from '../constants/statsConfig';
import StatsContainer from '../components/stats/StatsContainer';
import { getSleepMinutesForPeriod } from '../hooks/useTaskStatistics';

// Import SVG icons
import BiberonIcon from '../assets/biberon-color.svg';
import AllaitementIcon from '../assets/allaitement-color.svg';
import DodoIcon from '../assets/dodo-color.svg';
import CoucheIcon from '../assets/couche-color.svg';
import ThermoIcon from '../assets/thermo-color.svg';

interface AllStatsProps {
  navigation: any;
  tasks: Task[];
}

const CATEGORY_COLORS: Record<string, string> = {
  biberon:     '#34777B',
  allaitement: '#1AAAAA',
  sommeil:     '#E29656',
  couche:      '#C75B4A',
  temperature: '#4F469F',
};

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

const AllStats: React.FC<AllStatsProps> = ({ navigation, tasks }) => {
  const { t } = useTranslation();

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

      // Sleep: use overlap-based duration split so sessions crossing midnight
      // are correctly attributed to each day. Filter by overlap, not just start date.
      if (task.id === TASK_TYPES.SLEEP) {
        const sleepDuration = parseInt(task.label || '0');
        if (isNaN(sleepDuration) || sleepDuration <= 0) return;
        const sessionEnd = taskDate.clone().add(sleepDuration, 'minutes');
        // Include if session overlaps with the period at all
        if (taskDate.isBefore(endDate) && sessionEnd.isAfter(startDate)) {
          stats.sommeil.count++;
          stats.sommeil.quantity! += getSleepMinutesForPeriod(taskDate, sleepDuration, startDate, endDate);
        }
        return;
      }

      if (!taskDate.isBetween(startDate, endDate, undefined, '[]')) return;

      switch (task.id) {
        case TASK_TYPES.BIBERON:
          stats.biberon.count++;
          const bottleQty = parseFloat(task.label);
          if (!isNaN(bottleQty)) stats.biberon.quantity! += bottleQty;
          break;

        case TASK_TYPES.BREASTFEEDING:
          stats.allaitement.count++;
          const side = parseInt(task.label2 || '2');
          const duration = parseInt(task.label || '0');
          if (side === 0 || side === 2) {
            stats.allaitement.leftCount!++;
            stats.allaitement.leftDuration! += duration;
          }
          if (side === 1 || side === 2) {
            stats.allaitement.rightCount!++;
            stats.allaitement.rightDuration! += duration;
          }
          break;

        case TASK_TYPES.DIAPER:
          stats.couche.count++;
          break;

        case TASK_TYPES.TEMPERATURE:
          stats.temperature.count++;
          const temp = parseFloat(task.label);
          if (!isNaN(temp)) {
            if (stats.temperature.minTemp === undefined || temp < stats.temperature.minTemp) {
              stats.temperature.minTemp = temp;
            }
            if (stats.temperature.maxTemp === undefined || temp > stats.temperature.maxTemp) {
              stats.temperature.maxTemp = temp;
            }
          }
          break;
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  const formatQuantity = (value: number, unit: string) => {
    if (unit === 'ml' && value >= 1000) {
      return `${(value / 1000).toFixed(1)}L`;
    }
    return `${Math.round(value)}${unit}`;
  };

  const renderCategoryValue = (stats: CategoryStats, category: 'biberon' | 'allaitement' | 'sommeil' | 'couche' | 'temperature') => {
    switch (category) {
      case 'biberon':
        return (
          <View style={styles.cellContent}>
            <Text style={styles.cellText}>
              {stats.count} | {stats.quantity ? formatQuantity(stats.quantity, 'ml') : '-'}
            </Text>
          </View>
        );
      case 'allaitement':
        return (
          <View style={styles.cellContent}>
            <Text style={styles.cellText}>
              G: {stats.leftCount} | {stats.leftDuration ? formatDuration(stats.leftDuration) : '-'}
            </Text>
            <Text style={styles.cellText}>
              D: {stats.rightCount} | {stats.rightDuration ? formatDuration(stats.rightDuration) : '-'}
            </Text>
          </View>
        );
      case 'sommeil':
        return (
          <View style={styles.cellContent}>
            <Text style={styles.cellText}>
              {stats.count} | {stats.quantity ? formatDuration(stats.quantity) : '-'}
            </Text>
          </View>
        );
      case 'couche':
        return (
          <View style={styles.cellContent}>
            <Text style={styles.cellText}>{stats.count}</Text>
          </View>
        );
      case 'temperature':
        return (
          <View style={styles.cellContent}>
            <Text style={styles.cellText}>
              Min: {stats.minTemp ? `${stats.minTemp.toFixed(1)}°` : '-'}
            </Text>
            <Text style={styles.cellText}>
              Max: {stats.maxTemp ? `${stats.maxTemp.toFixed(1)}°` : '-'}
            </Text>
          </View>
        );
    }
  };

  const getCategoryNavTarget = (category: string): (() => void) => {
    if (category === 'biberon') {
      return () => navigation.navigate('BiberonInsights');
    }
    const idMap: Record<string, number> = {
      allaitement: 5,
      sommeil: 3,
      couche: 1,
      temperature: 4,
    };
    return () => navigation.navigate('CategoryDetail', { categoryId: idMap[category] });
  };

  const renderCategoryRow = (
    icon: React.ReactNode,
    color: string,
    todayStats: CategoryStats,
    yesterdayStats: CategoryStats,
    last7Stats: CategoryStats,
    category: 'biberon' | 'allaitement' | 'sommeil' | 'couche' | 'temperature'
  ) => {
    const onPress = getCategoryNavTarget(category);
    return (
      <TouchableOpacity
        style={[styles.categoryRow, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconCell}>
          {icon}
        </View>
        <View style={styles.dataCell}>
          {renderCategoryValue(todayStats, category)}
        </View>
        <View style={styles.dataCell}>
          {renderCategoryValue(yesterdayStats, category)}
        </View>
        <View style={styles.dataCell}>
          {renderCategoryValue(last7Stats, category)}
        </View>
        <View style={styles.chevronCell}>
          <MaterialCommunityIcons name="chevron-right" size={20} color={color} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <StatsContainer
      loading={false}
      error={null}
      hasData={tasks.length > 0}
      emptyMessage={t('stats.noData')}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.tableCard}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.iconCell}>
              <MaterialCommunityIcons name="calendar-range" size={32} color="#C75B4A" />
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.headerText}>{t('allaitement.today')}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.headerText}>{t('allaitement.yesterday')}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.headerText}>7j</Text>
            </View>
          </View>

          {/* Category Rows */}
          {renderCategoryRow(
            <BiberonIcon width={32} height={32} />,
            STATS_CONFIG.COLORS.BIBERON,
            todayStats.biberon,
            yesterdayStats.biberon,
            last7DaysStats.biberon,
            'biberon'
          )}

          {renderCategoryRow(
            <AllaitementIcon width={32} height={32} />,
            STATS_CONFIG.COLORS.BREASTFEEDING,
            todayStats.allaitement,
            yesterdayStats.allaitement,
            last7DaysStats.allaitement,
            'allaitement'
          )}

          {renderCategoryRow(
            <DodoIcon width={32} height={32} />,
            STATS_CONFIG.COLORS.SLEEP,
            todayStats.sommeil,
            yesterdayStats.sommeil,
            last7DaysStats.sommeil,
            'sommeil'
          )}

          {renderCategoryRow(
            <CoucheIcon width={32} height={32} />,
            STATS_CONFIG.COLORS.DIAPER,
            todayStats.couche,
            yesterdayStats.couche,
            last7DaysStats.couche,
            'couche'
          )}

          {renderCategoryRow(
            <ThermoIcon width={32} height={32} />,
            STATS_CONFIG.COLORS.TEMPERATURE,
            todayStats.temperature,
            yesterdayStats.temperature,
            last7DaysStats.temperature,
            'temperature'
          )}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => navigation.navigate('ExportTasks')}
        >
          <MaterialCommunityIcons name="file-download" size={24} color="#FFF" />
          <Text style={styles.exportButtonText}>{t('export.page.exportButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 16,
  },
  tableCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  iconCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCell: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },
  dataCell: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cellContent: {
    alignItems: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C75B4A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default AllStats;
