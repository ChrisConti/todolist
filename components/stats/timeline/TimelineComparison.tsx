import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { STATS_CONFIG } from '../../../constants/statsConfig';
import { Task } from '../../../types/stats';

interface TimelineComparisonProps {
  tasks: Task[];
  viewMode: 'quantity' | 'count';
}

interface DayData {
  bottles: Array<{
    time: moment.Moment;
    value: number;
    hour: string;
  }>;
  total: number;
  count: number;
}

const TimelineComparison: React.FC<TimelineComparisonProps> = ({ tasks, viewMode }) => {
  const { t } = useTranslation();

  // Colors
  const TODAY_COLOR = '#34777B';
  const YESTERDAY_COLOR = '#B0B0B0';

  // Timeline configuration
  const START_HOUR = 0;
  const END_HOUR = 24;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TIMELINE_HEIGHT = 600; // pixels
  const PIXELS_PER_HOUR = TIMELINE_HEIGHT / TOTAL_HOURS;

  // Calculate data for today and yesterday
  const { todayData, yesterdayData } = useMemo(() => {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');

    const todayBottles: DayData = { bottles: [], total: 0, count: 0 };
    const yesterdayBottles: DayData = { bottles: [], total: 0, count: 0 };

    tasks.forEach((task) => {
      const taskMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const value = viewMode === 'quantity' ? parseFloat(task.label) : 1;

      if (isNaN(value) && viewMode === 'quantity') return;

      if (taskMoment.isSame(today, 'day')) {
        todayBottles.bottles.push({
          time: taskMoment,
          value: viewMode === 'quantity' ? value : value,
          hour: taskMoment.format('HH:mm'),
        });
        todayBottles.total += value;
        todayBottles.count += 1;
      } else if (taskMoment.isSame(yesterday, 'day')) {
        yesterdayBottles.bottles.push({
          time: taskMoment,
          value: viewMode === 'quantity' ? value : value,
          hour: taskMoment.format('HH:mm'),
        });
        yesterdayBottles.total += value;
        yesterdayBottles.count += 1;
      }
    });

    // Sort by time
    todayBottles.bottles.sort((a, b) => a.time.diff(b.time));
    yesterdayBottles.bottles.sort((a, b) => a.time.diff(b.time));

    return {
      todayData: todayBottles,
      yesterdayData: yesterdayBottles,
    };
  }, [tasks, viewMode]);

  // Calculate position on timeline (in pixels from top)
  const getPositionFromTime = (time: moment.Moment): number => {
    const hours = time.hours();
    const minutes = time.minutes();
    const totalMinutes = hours * 60 + minutes;
    const positionRatio = totalMinutes / (TOTAL_HOURS * 60);
    return positionRatio * TIMELINE_HEIGHT;
  };

  // Calculate differences
  const quantityDiff = todayData.total - yesterdayData.total;
  const quantityPercentChange = yesterdayData.total > 0
    ? ((quantityDiff / yesterdayData.total) * 100).toFixed(0)
    : 0;

  const countDiff = todayData.count - yesterdayData.count;
  const countPercentChange = yesterdayData.count > 0
    ? ((countDiff / yesterdayData.count) * 100).toFixed(0)
    : 0;

  // Render hour markers on the timeline
  const renderHourMarkers = () => {
    const markers = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour += 3) {
      const position = (hour / TOTAL_HOURS) * TIMELINE_HEIGHT;
      markers.push(
        <View key={hour} style={[styles.hourMarker, { top: position }]}>
          <Text style={styles.hourText}>{hour}h</Text>
        </View>
      );
    }
    return markers;
  };

  // Render bottles for a day
  const renderBottles = (dayData: DayData, side: 'left' | 'right', color: string) => {
    return dayData.bottles.map((bottle, index) => {
      const position = getPositionFromTime(bottle.time);
      const displayValue = viewMode === 'quantity' ? `${bottle.value}ml` : '';

      return (
        <View
          key={index}
          style={[
            styles.bottleContainer,
            side === 'left' ? styles.bottleLeft : styles.bottleRight,
            { top: position },
          ]}
        >
          {side === 'left' ? (
            <>
              <View style={styles.bottleInfo}>
                <Text style={[styles.bottleValue, { color }]}>{displayValue}</Text>
                <Text style={[styles.bottleTime, { color }]}>{bottle.hour}</Text>
              </View>
              <View style={[styles.bottleLine, { backgroundColor: color }]} />
              <View style={[styles.bottleDot, { backgroundColor: color }]} />
            </>
          ) : (
            <>
              <View style={[styles.bottleDot, { backgroundColor: color }]} />
              <View style={[styles.bottleLine, { backgroundColor: color }]} />
              <View style={styles.bottleInfo}>
                <Text style={[styles.bottleValue, { color }]}>{displayValue}</Text>
                <Text style={[styles.bottleTime, { color }]}>{bottle.hour}</Text>
              </View>
            </>
          )}
        </View>
      );
    });
  };

  const formatTotal = (value: number) => {
    return viewMode === 'quantity' ? `${value}ml` : `${value}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Totals */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: TODAY_COLOR }]}>
            {t('days.today')}
          </Text>
          <Text style={[styles.totalValue, { color: TODAY_COLOR }]}>
            {formatTotal(todayData.total)}
          </Text>
          <Text style={styles.totalCount}>({todayData.count}×)</Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: YESTERDAY_COLOR }]}>
            {t('days.yesterday')}
          </Text>
          <Text style={[styles.totalValue, { color: YESTERDAY_COLOR }]}>
            {formatTotal(yesterdayData.total)}
          </Text>
          <Text style={styles.totalCount}>({yesterdayData.count}×)</Text>
        </View>
      </View>

      {/* Difference */}
      {yesterdayData.total > 0 && (
        <View style={styles.differenceContainer}>
          <View style={styles.differenceRow}>
            <Text style={styles.differenceLabel}>{t('stats.quantity')} :</Text>
            <Text style={styles.differenceValue}>
              {quantityDiff > 0 ? '↗' : quantityDiff < 0 ? '↘' : '='}{' '}
              {quantityDiff > 0 ? '+' : ''}{formatTotal(Math.abs(quantityDiff))}{' '}
              ({quantityDiff > 0 ? '+' : ''}{quantityPercentChange}%)
            </Text>
          </View>
          <View style={styles.differenceRow}>
            <Text style={styles.differenceLabel}>{t('stats.count')} :</Text>
            <Text style={styles.differenceValue}>
              {countDiff > 0 ? '↗' : countDiff < 0 ? '↘' : '='}{' '}
              {countDiff > 0 ? '+' : ''}{Math.abs(countDiff)} {t('biberon.biberon')}{' '}
              ({countDiff > 0 ? '+' : ''}{countPercentChange}%)
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: TODAY_COLOR }]}>
          {t('days.today')}
        </Text>
        <Text style={[styles.headerText, { color: YESTERDAY_COLOR }]}>
          {t('days.yesterday')}
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        {/* Central axis */}
        <View style={styles.centralAxis} />

        {/* Hour markers */}
        {renderHourMarkers()}

        {/* Today's bottles (left) */}
        {renderBottles(todayData, 'left', TODAY_COLOR)}

        {/* Yesterday's bottles (right) */}
        {renderBottles(yesterdayData, 'right', YESTERDAY_COLOR)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  timelineContainer: {
    height: 600,
    position: 'relative',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  centralAxis: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E0E0E0',
    marginLeft: -1,
  },
  hourMarker: {
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    width: 40,
    alignItems: 'center',
  },
  hourText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#FDF1E7',
    paddingHorizontal: 4,
  },
  bottleContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginTop: -12, // Center on the exact time
  },
  bottleLeft: {
    right: '50%',
    justifyContent: 'flex-end',
    paddingRight: 2,
  },
  bottleRight: {
    left: '50%',
    justifyContent: 'flex-start',
    paddingLeft: 2,
  },
  bottleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bottleLine: {
    width: 30,
    height: 2,
  },
  bottleInfo: {
    paddingHorizontal: 8,
    minWidth: 60,
  },
  bottleValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottleTime: {
    fontSize: 11,
    opacity: 0.8,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  totalCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  totalCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  differenceContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  differenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  differenceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  differenceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
  differenceText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TimelineComparison;
