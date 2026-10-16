import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { STATS_CONFIG } from '../../../constants/statsConfig';
import { Task } from '../../../types/stats';

interface Timeline7DaysProps {
  tasks: Task[];
  viewMode: 'quantity' | 'count';
}

interface DayColumn {
  date: moment.Moment;
  label: string;
  bottles: Array<{
    time: moment.Moment;
    value: number;
  }>;
  total: number;
  count: number;
}

const Timeline7Days: React.FC<Timeline7DaysProps> = ({ tasks, viewMode }) => {
  const { t, i18n } = useTranslation();

  // Timeline configuration
  const START_HOUR = 0;
  const END_HOUR = 24;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TIMELINE_HEIGHT = 550; // Increased for better spacing
  const PIXELS_PER_HOUR = TIMELINE_HEIGHT / TOTAL_HOURS;

  // Base color for gradient
  const BASE_COLOR = { r: 52, g: 119, b: 123 }; // #34777B

  // Calculate data for last 7 days
  const daysData = useMemo(() => {
    const days: DayColumn[] = [];

    for (let i = 0; i < 7; i++) {
      const date = moment().subtract(i, 'days').startOf('day');
      const dayLetter = i18n.language === 'fr' ? 'J' : 'D';
      const label = i === 0 ? dayLetter : `${dayLetter}-${i}`;
      const dayData: DayColumn = {
        date,
        label,
        bottles: [],
        total: 0,
        count: 0,
      };

      tasks.forEach((task) => {
        const taskMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
        if (taskMoment.isSame(date, 'day')) {
          const value = viewMode === 'quantity' ? parseFloat(task.label) : 1;
          if (!isNaN(value) || viewMode === 'count') {
            dayData.bottles.push({
              time: taskMoment,
              value: viewMode === 'quantity' ? value : 1,
            });
            dayData.total += viewMode === 'quantity' ? value : 1;
            dayData.count += 1;
          }
        }
      });

      // Sort by time
      dayData.bottles.sort((a, b) => a.time.diff(b.time));
      days.push(dayData);
    }

    // Reverse so "Aujourd'hui" is on the right (chronological order: past → present)
    return days.reverse();
  }, [tasks, viewMode, t]);

  // Get color with opacity based on day index (gradient effect)
  // After reverse: index 0 = oldest (J-6), index 6 = today (most recent)
  const getColorForDay = (dayIndex: number): string => {
    const opacity = 0.3 + (dayIndex * 0.1); // Fade from 0.3 (oldest) to 0.9 (today)
    return `rgba(${BASE_COLOR.r}, ${BASE_COLOR.g}, ${BASE_COLOR.b}, ${opacity})`;
  };

  // Calculate position on timeline
  const getPositionFromTime = (time: moment.Moment): number => {
    const hours = time.hours();
    const minutes = time.minutes();
    const totalMinutes = hours * 60 + minutes;
    const positionRatio = totalMinutes / (TOTAL_HOURS * 60);
    return positionRatio * TIMELINE_HEIGHT;
  };

  // Format hour based on language
  const formatHour = (hour: number): string => {
    if (i18n.language === 'fr') {
      return `${hour}h`;
    }
    // English/Spanish use 12-hour format with AM/PM
    if (hour === 0 || hour === 24) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  // Render hour markers
  const renderHourMarkers = () => {
    const markers = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour += 2) {
      const position = (hour / TOTAL_HOURS) * TIMELINE_HEIGHT;
      markers.push(
        <View key={hour} style={[styles.hourMarkerLine, { top: position }]}>
          <Text style={styles.hourMarkerText}>{formatHour(hour)}</Text>
        </View>
      );
    }
    return markers;
  };

  // Calculate overall stats
  const totalBottles = daysData.reduce((sum, day) => sum + day.count, 0);
  const totalQuantity = daysData.reduce((sum, day) => sum + day.total, 0);
  const avgPerDay = totalBottles > 0 ? (totalQuantity / 7).toFixed(0) : 0;
  const avgCountPerDay = (totalBottles / 7).toFixed(1);

  // Calculate time patterns
  const timePatterns = useMemo(() => {
    let firstBottleTimes: number[] = [];
    let lastBottleTimes: number[] = [];
    let allIntervals: number[] = [];

    daysData.forEach(day => {
      if (day.bottles.length > 0) {
        // First bottle of the day (earliest time)
        const firstTime = day.bottles[0].time;
        const firstMinutes = firstTime.hours() * 60 + firstTime.minutes();
        firstBottleTimes.push(firstMinutes);

        // Last bottle of the day (latest time)
        const lastTime = day.bottles[day.bottles.length - 1].time;
        const lastMinutes = lastTime.hours() * 60 + lastTime.minutes();
        lastBottleTimes.push(lastMinutes);

        // Calculate intervals between bottles
        for (let i = 1; i < day.bottles.length; i++) {
          const interval = day.bottles[i].time.diff(day.bottles[i - 1].time, 'minutes');
          allIntervals.push(interval);
        }
      }
    });

    const avgFirstBottle = firstBottleTimes.length > 0
      ? Math.round(firstBottleTimes.reduce((a, b) => a + b, 0) / firstBottleTimes.length)
      : null;

    const avgLastBottle = lastBottleTimes.length > 0
      ? Math.round(lastBottleTimes.reduce((a, b) => a + b, 0) / lastBottleTimes.length)
      : null;

    const avgInterval = allIntervals.length > 0
      ? Math.round(allIntervals.reduce((a, b) => a + b, 0) / allIntervals.length)
      : null;

    const formatTime = (minutes: number | null) => {
      if (minutes === null) return '-';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    };

    const formatDuration = (minutes: number | null) => {
      if (minutes === null) return '-';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0) {
        return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
      }
      return `${mins}m`;
    };

    return {
      avgFirstBottle: formatTime(avgFirstBottle),
      avgLastBottle: formatTime(avgLastBottle),
      avgInterval: formatDuration(avgInterval),
    };
  }, [daysData]);

  const formatValue = (value: number) => {
    return `${value}`;
  };

  // Milk type breakdown per day for the stacked bar chart
  const { milkChartData, mlChartData } = useMemo(() => {
    const chartData = daysData.map(day => {
      let artificialCount = 0, maternalCount = 0, otherCount = 0;
      let artificialMl = 0, maternalMl = 0, otherMl = 0;
      tasks.forEach(task => {
        const taskMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
        if (!taskMoment.isSame(day.date, 'day')) return;
        const ml = parseFloat(task.label);
        const validMl = isNaN(ml) ? 0 : ml;
        if (task.milkType === 'artificial') { artificialCount++; artificialMl += validMl; }
        else if (task.milkType === 'maternal') { maternalCount++; maternalMl += validMl; }
        else { otherCount++; otherMl += validMl; }
      });
      return {
        counts: [artificialCount, maternalCount, otherCount],
        ml: [Math.round(artificialMl), Math.round(maternalMl), Math.round(otherMl)],
      };
    });
    return {
      milkChartData: chartData.map(d => d.counts),
      mlChartData: chartData.map(d => d.ml),
    };
  }, [daysData, tasks]);

  const milkLabels = daysData.map(day => day.label);
  const milkColors = ['#34777B', '#E29656', '#9DB0A0'];
  const milkEmojis = ['🥛', '🤱', '🫗'];

  const renderMilkChart = (chartData: number[][], formatter: (v: number) => string) => (
    <View style={styles.fixedChart}>
      {chartData.map((dayData, index) => {
        const hasData = dayData.reduce((a, b) => a + b, 0) > 0;
        return (
          <View key={index} style={styles.fixedColumn}>
            {hasData && (
              <>
                <Text style={styles.barTotal}>{dayData.reduce((a, b) => a + b, 0)}</Text>
                <View style={styles.fixedBar}>
                  {[0, 1, 2].map(typeIdx => {
                    const value = dayData[typeIdx];
                    if (value === 0) return null;
                    return (
                      <View key={typeIdx} style={styles.barRow}>
                        <Text style={styles.barRowEmoji}>{milkEmojis[typeIdx]}</Text>
                        <Text
                          style={[styles.barRowValue, { color: milkColors[typeIdx] }]}
                          adjustsFontSizeToFit
                          numberOfLines={1}
                          minimumFontScale={0.6}
                        >
                          {formatter(value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
            <Text style={styles.fixedDayLabel}>{milkLabels[index]}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Count by milk type */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>{t('stats.count')}</Text>
        {renderMilkChart(milkChartData, v => v > 0 ? `${v}` : '-')}
      </View>

      {/* ml by milk type */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>{t('stats.quantity')} <Text style={styles.chartTitleUnit}>{t('stats.quantityUnit')}</Text></Text>
        {renderMilkChart(mlChartData, v => v > 0 ? `${v}` : '-')}
      </View>

      {/* Timeline with columns */}
      <View style={styles.timelineWrapper}>
        <View style={styles.timelineContainer}>
          {/* Hour markers background */}
          <View style={styles.hourMarkersContainer}>
            {renderHourMarkers()}
          </View>

          {/* Days columns */}
          {daysData.map((day, dayIndex) => {
            const color = getColorForDay(dayIndex);
            return (
              <View key={dayIndex} style={styles.dayColumn}>
                {/* Day label */}
                <Text style={[styles.dayLabel, { color }]}>{day.label}</Text>

                {/* Timeline column */}
                <View style={styles.columnTimeline}>
                  <View style={[styles.columnAxis, { backgroundColor: color, opacity: 0.3 }]} />

                  {/* Bottles */}
                  {day.bottles.map((bottle, bottleIndex) => {
                    const position = getPositionFromTime(bottle.time);
                    const displayValue = viewMode === 'quantity' ? Math.round(bottle.value) : bottle.value;
                    return (
                      <View
                        key={bottleIndex}
                        style={[styles.bottleDot, { top: position, backgroundColor: color }]}
                      >
                        <Text style={styles.bottleDotText}>{displayValue}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Day totals */}
                <View style={styles.dayTotals}>
                  <Text style={[styles.dayTotal, { color }]}>
                    {formatValue(day.total)}
                  </Text>
                  <Text style={styles.dayCount}>({day.count}×)</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Overall stats - only show if avg >= 2 bottles per day */}
      {parseFloat(avgCountPerDay) >= 2 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>📊 {t('stats.average')}</Text>
            <Text style={styles.statValue}>
              {formatValue(Number(avgPerDay))}
            </Text>
            <Text style={styles.statSubValue}>
              {avgCountPerDay} {t('biberon.biberon')}
            </Text>
          </View>

          {/* Time patterns */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>🕐 {t('stats.timePatterns')}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeItemLabel}>{t('stats.firstBottle')}</Text>
                <Text style={styles.timeItemValue}>{timePatterns.avgFirstBottle}</Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeItemLabel}>{t('stats.lastBottle')}</Text>
                <Text style={styles.timeItemValue}>{timePatterns.avgLastBottle}</Text>
              </View>
            </View>
            <View style={styles.intervalRow}>
              <Text style={styles.intervalLabel}>{t('stats.avgInterval')}</Text>
              <Text style={styles.intervalValue}>{timePatterns.avgInterval}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 16,
  },
  chartSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartTitleUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
    textTransform: 'none',
    letterSpacing: 0,
  },
  fixedChart: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-end',
    minHeight: 160,
  },
  fixedColumn: {
    flex: 1,
    alignItems: 'center',
  },
  fixedBar: {
    width: '100%',
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 10,
    height: 120,
    justifyContent: 'center',
  },
  barTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  barRowEmoji: {
    fontSize: 14,
  },
  barRowValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  fixedDayLabel: {
    marginTop: 8,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  timelineWrapper: {
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
  },
  timelineContainer: {
    flexDirection: 'row',
    height: 650,
    position: 'relative',
    paddingLeft: 38,
  },
  hourMarkersContainer: {
    position: 'absolute',
    left: -38,
    right: 0,
    top: 32,
    height: 550,
  },
  hourMarkerLine: {
    position: 'absolute',
    left: 45,
    right: 0,
    height: 1,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
  },
  hourMarkerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    backgroundColor: '#FDF1E7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    left: 0,
    borderRadius: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  columnTimeline: {
    width: '100%',
    height: 550,
    position: 'relative',
    alignItems: 'center',
  },
  columnAxis: {
    position: 'absolute',
    width: 2,
    height: '100%',
    left: '50%',
    marginLeft: -1,
  },
  bottleDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  dayTotals: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayTotal: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayCount: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34777B',
  },
  statSubValue: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 16,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeItemLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  timeItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34777B',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  intervalLabel: {
    fontSize: 12,
    color: '#666',
  },
  intervalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E29656',
  },
});

export default Timeline7Days;
