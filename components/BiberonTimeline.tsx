import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

const MATERNAL_COLOR = '#34777B';
const ARTIFICIAL_COLOR = '#E29656';
const UNKNOWN_COLOR = '#B0B0B0';
const YESTERDAY_COLOR = '#B0B0B0';
const BG = '#FDF1E7';

const getMilkColor = (milkType?: string | null) => {
  if (milkType === 'maternal') return MATERNAL_COLOR;
  if (milkType === 'artificial') return ARTIFICIAL_COLOR;
  return UNKNOWN_COLOR;
};

const getMilkEmoji = (milkType?: string | null) => {
  if (milkType === 'maternal') return '🤱';
  if (milkType === 'artificial') return '🥛';
  return '🍼';
};

// ─── Single Day Timeline ──────────────────────────────────────────────────────

interface SingleProps {
  tasks: any[];
}

export const SingleDayTimeline: React.FC<SingleProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  const sorted = [...tasks].sort((a, b) =>
    moment(a.date, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.date, 'YYYY-MM-DD HH:mm:ss'))
  );

  const firstM = moment(sorted[0].date, 'YYYY-MM-DD HH:mm:ss');
  const lastM = moment(sorted[sorted.length - 1].date, 'YYYY-MM-DD HH:mm:ss');

  const startM = firstM.clone().subtract(45, 'minutes');
  const endM = lastM.clone().add(45, 'minutes');
  const rangeMin = Math.max(endM.diff(startM, 'minutes'), 120);

  const TIMELINE_H = Math.max(280, sorted.length * 56);
  const PX_PER_MIN = TIMELINE_H / rangeMin;
  const AXIS_X = 44;

  const getY = (m: moment.Moment) =>
    m.diff(startM, 'minutes') * PX_PER_MIN;

  // Hour markers
  const hourMarkers: moment.Moment[] = [];
  const hCursor = startM.clone().add(1, 'hour').startOf('hour');
  while (hCursor.isBefore(endM)) {
    hourMarkers.push(hCursor.clone());
    hCursor.add(1, 'hour');
  }

  // Overlap resolution — min 44px between labels
  const MIN_GAP = 44;
  const labelPositions: number[] = [];
  let lastY = -MIN_GAP;
  sorted.forEach((task) => {
    const ideal = getY(moment(task.date, 'YYYY-MM-DD HH:mm:ss'));
    const y = Math.max(ideal, lastY + MIN_GAP);
    labelPositions.push(y);
    lastY = y;
  });

  const containerH = Math.max(TIMELINE_H, (labelPositions[labelPositions.length - 1] ?? 0) + 40);

  return (
    <View style={{ height: containerH, position: 'relative', marginTop: 4 }}>
      {/* Axis */}
      <View style={[s.axis, { left: AXIS_X, height: containerH }]} />

      {/* Hour markers */}
      {hourMarkers.map((h) => {
        const y = getY(h);
        return (
          <View key={h.format('HHmm')} style={[s.hourRow, { top: y - 8 }]}>
            <Text style={s.hourText}>{h.format('HH')}h</Text>
            <View style={s.hourTick} />
          </View>
        );
      })}

      {/* Events */}
      {sorted.map((task, i) => {
        const dotY = getY(moment(task.date, 'YYYY-MM-DD HH:mm:ss'));
        const labelY = labelPositions[i];
        const color = getMilkColor(task.milkType);
        const ml = parseFloat(task.label) || 0;
        const hasOffset = Math.abs(dotY - labelY) > 6;

        return (
          <View key={task.uid ?? i}>
            {/* Connector dot → label */}
            {hasOffset && (
              <View style={[
                s.connector,
                {
                  left: AXIS_X + 7,
                  top: Math.min(dotY, labelY) + 7,
                  height: Math.abs(dotY - labelY) - 7,
                  backgroundColor: color + '50',
                },
              ]} />
            )}
            {/* Dot on axis */}
            <View style={[s.dot, { left: AXIS_X - 6, top: dotY - 6, backgroundColor: color }]} />
            {/* Label */}
            <View style={[s.labelRow, { left: AXIS_X + 18, top: labelY - 18 }]}>
              <Text style={s.labelEmoji}>{getMilkEmoji(task.milkType)}</Text>
              <View>
                <Text style={[s.labelTime, { color }]}>
                  {moment(task.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')}
                </Text>
                {ml > 0 && <Text style={s.labelMl}>{ml} ml</Text>}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─── Compare Day Timeline ─────────────────────────────────────────────────────

interface CompareProps {
  todayTasks: any[];
  yesterdayTasks: any[];
}

export const CompareDayTimeline: React.FC<CompareProps> = ({ todayTasks, yesterdayTasks }) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = React.useState(0);

  if (todayTasks.length === 0 && yesterdayTasks.length === 0) return null;

  // Normalize any moment to a time-of-day on an arbitrary shared date
  // so 11:45 yesterday and 11:45 today land at exactly the same Y position
  const BASE = moment('2000-01-01', 'YYYY-MM-DD');
  const toTimeOnly = (m: moment.Moment) =>
    BASE.clone().hours(m.hours()).minutes(m.minutes()).seconds(m.seconds());

  const allTasks = [...todayTasks, ...yesterdayTasks];
  const allNorm = allTasks.map(t => toTimeOnly(moment(t.date, 'YYYY-MM-DD HH:mm:ss')));
  const startM = moment.min(allNorm).clone().subtract(45, 'minutes');
  const endM = moment.max(allNorm).clone().add(45, 'minutes');
  const rangeMin = Math.max(endM.diff(startM, 'minutes'), 120);

  const TIMELINE_H = Math.max(300, allTasks.length * 44);
  const PX_PER_MIN = TIMELINE_H / rangeMin;
  const MIN_GAP = 44;

  const getY = (m: moment.Moment) => toTimeOnly(m).diff(startM, 'minutes') * PX_PER_MIN;

  // Hour markers
  const hourMarkers: moment.Moment[] = [];
  const hc = startM.clone().add(1, 'hour').startOf('hour');
  while (hc.isBefore(endM)) { hourMarkers.push(hc.clone()); hc.add(1, 'hour'); }

  // Overlap resolution per side
  const resolvePositions = (tasks: any[]) => {
    const positions: number[] = [];
    let lastY = -MIN_GAP;
    tasks.forEach(task => {
      const ideal = getY(moment(task.date, 'YYYY-MM-DD HH:mm:ss'));
      const y = Math.max(ideal, lastY + MIN_GAP);
      positions.push(y);
      lastY = y;
    });
    return positions;
  };

  const todayPositions = resolvePositions(todayTasks);
  const yesterdayPositions = resolvePositions(yesterdayTasks);
  const containerH = Math.max(TIMELINE_H, ...[...todayPositions, ...yesterdayPositions].map(y => y + 40));
  const axisX = containerWidth / 2;

  return (
    <View>
      {/* Headers */}
      <View style={s.cmpHeaders}>
        <Text style={[s.cmpHeader, { color: MATERNAL_COLOR }]}>{t('days.today')}</Text>
        <Text style={[s.cmpHeader, { color: YESTERDAY_COLOR }]}>{t('days.yesterday')}</Text>
      </View>

      <View
        style={{ height: containerH, position: 'relative' }}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth === 0 ? null : (
          <>
            {/* Central axis */}
            <View style={[s.axis, { left: axisX - 1, height: containerH }]} />

            {/* Hour markers centered on axis */}
            {hourMarkers.map(h => {
              const y = getY(h);
              return (
                <View key={h.format('HHmm')} style={[s.cmpHourRow, { top: y - 9, left: axisX - 18 }]}>
                  <Text style={s.cmpHourText}>{h.format('HH')}h</Text>
                </View>
              );
            })}

            {/* Today — left side, labels to the left of axis */}
            {todayTasks.map((task, i) => {
              const dotY = getY(moment(task.date, 'YYYY-MM-DD HH:mm:ss'));
              const labelY = todayPositions[i];
              const color = getMilkColor(task.milkType);
              const ml = parseFloat(task.label) || 0;
              const hasOffset = Math.abs(dotY - labelY) > 6;

              return (
                <View key={task.uid ?? `today-${i}`}>
                  {hasOffset && (
                    <View style={[s.connector, {
                      left: axisX - 8,
                      top: Math.min(dotY, labelY) + 7,
                      height: Math.abs(dotY - labelY) - 7,
                      backgroundColor: color + '50',
                    }]} />
                  )}
                  {/* Dot on axis */}
                  <View style={[s.dot, { left: axisX - 7, top: dotY - 7, backgroundColor: color }]} />
                  {/* Label to the left, right-aligned towards axis */}
                  <View style={[s.labelRowLeft, { right: containerWidth - axisX + 18, top: labelY - 18 }]}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.labelTime, { color }]}>
                        {moment(task.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')}
                      </Text>
                      {ml > 0 && <Text style={s.labelMl}>{ml} ml</Text>}
                    </View>
                    <Text style={s.labelEmoji}>{getMilkEmoji(task.milkType)}</Text>
                  </View>
                </View>
              );
            })}

            {/* Yesterday — right side, labels to the right of axis */}
            {yesterdayTasks.map((task, i) => {
              const dotY = getY(moment(task.date, 'YYYY-MM-DD HH:mm:ss'));
              const labelY = yesterdayPositions[i];
              const color = getMilkColor(task.milkType);
              const ml = parseFloat(task.label) || 0;
              const hasOffset = Math.abs(dotY - labelY) > 6;

              return (
                <View key={task.uid ?? `yesterday-${i}`}>
                  {hasOffset && (
                    <View style={[s.connector, {
                      left: axisX + 7,
                      top: Math.min(dotY, labelY) + 7,
                      height: Math.abs(dotY - labelY) - 7,
                      backgroundColor: color + '50',
                    }]} />
                  )}
                  {/* Dot on axis */}
                  <View style={[s.dot, { left: axisX - 7, top: dotY - 7, backgroundColor: color }]} />
                  {/* Label to the right */}
                  <View style={[s.labelRow, { left: axisX + 18, top: labelY - 18 }]}>
                    <Text style={s.labelEmoji}>{getMilkEmoji(task.milkType)}</Text>
                    <View>
                      <Text style={[s.labelTime, { color }]}>
                        {moment(task.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')}
                      </Text>
                      {ml > 0 && <Text style={s.labelMl}>{ml} ml</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  axis: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourText: {
    fontSize: 11,
    color: '#AAA',
    width: 30,
    textAlign: 'right',
  },
  hourTick: {
    width: 8,
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 3,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  connector: {
    position: 'absolute',
    width: 1,
  },
  labelRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelEmoji: { fontSize: 15 },
  labelTime: { fontSize: 13, fontWeight: '700' },
  labelMl: { fontSize: 11, color: '#999', marginTop: 1 },

  labelRowLeft: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Compare headers
  cmpHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cmpHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  cmpHourRow: {
    position: 'absolute',
    alignItems: 'center',
    width: 36,
  },
  cmpHourText: {
    fontSize: 11,
    color: '#AAA',
    backgroundColor: BG,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
});
