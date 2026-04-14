import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

type Period = '7' | '30' | '90';
type Metric = 'ml' | 'count';

interface Props {
  tasks: any[];
}

interface BarData {
  label: string;
  sublabel?: string;   // e.g. short date for 30j
  value: number;
  hasData: boolean;
}

const BIBERON_COLOR = '#34777B';
const BG = '#FDF1E7';

// ─── Layout constants ─────────────────────────────────────────────────────────
const CHART_H_VERT = 140;   // height of vertical bar chart area (7j)
const LABEL_W = 34;         // left label column width in horizontal chart
const VALUE_W = 46;         // right value column width in horizontal chart
const ROW_H_30 = 9;         // bar row height for 30j
const ROW_H_90 = 22;        // bar row height for 90j
const BAR_H_30 = 5;         // actual bar thickness for 30j
const BAR_H_90 = 13;        // actual bar thickness for 90j

// ─── Data helpers ─────────────────────────────────────────────────────────────

const buildDailyBars = (tasks: any[], metric: Metric, days: number): BarData[] =>
  Array.from({ length: days }, (_, i) => {
    const day = moment().subtract(days - 1 - i, 'days');
    const dayTasks = tasks.filter(t =>
      moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSame(day, 'day')
    );
    return {
      label: day.format('D'),           // day of month: "1"…"31"
      sublabel: day.format('dd'),       // day name: "Mo"
      value: metric === 'ml'
        ? dayTasks.reduce((s, t) => s + (parseFloat(t.label) || 0), 0)
        : dayTasks.length,
      hasData: dayTasks.length > 0,
    };
  });

const buildWeeklyBars = (tasks: any[], metric: Metric, weeks: number): BarData[] =>
  Array.from({ length: weeks }, (_, i) => {
    const weekStart = moment().subtract(weeks - 1 - i, 'weeks').startOf('isoWeek');
    const weekEnd = weekStart.clone().endOf('isoWeek');
    const weekTasks = tasks.filter(t => {
      const m = moment(t.date, 'YYYY-MM-DD HH:mm:ss');
      return m.isSameOrAfter(weekStart) && m.isSameOrBefore(weekEnd);
    });
    return {
      label: `S${i + 1}`,
      sublabel: weekStart.format('D/M'),
      value: metric === 'ml'
        ? weekTasks.reduce((s, t) => s + (parseFloat(t.label) || 0), 0)
        : weekTasks.length,
      hasData: weekTasks.length > 0,
    };
  });

// ─── Component ────────────────────────────────────────────────────────────────

export const TendanceChart: React.FC<Props> = ({ tasks }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30');
  const [metric, setMetric] = useState<Metric>('ml');
  const [chartWidth, setChartWidth] = useState(0);

  const bars = useMemo((): BarData[] => {
    if (period === '7')  return buildDailyBars(tasks, metric, 7);
    if (period === '30') return buildDailyBars(tasks, metric, 30);
    return buildWeeklyBars(tasks, metric, 13);
  }, [tasks, period, metric]);

  const maxValue = Math.max(...bars.map(b => b.value), 1);
  const filledBars = bars.filter(b => b.hasData);
  const avg = filledBars.length > 0
    ? filledBars.reduce((s, b) => s + b.value, 0) / filledBars.length
    : 0;

  // Trend: compare 2nd half vs 1st half
  const half = Math.floor(bars.length / 2);
  const avgFirst = (() => {
    const sl = bars.slice(0, half).filter(b => b.hasData);
    return sl.length ? sl.reduce((s, b) => s + b.value, 0) / sl.length : 0;
  })();
  const avgSecond = (() => {
    const sl = bars.slice(half).filter(b => b.hasData);
    return sl.length ? sl.reduce((s, b) => s + b.value, 0) / sl.length : 0;
  })();
  const trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
  const trend =
    Math.abs(trendPct) < 5
      ? { label: t('tendance.stable'), color: '#999' }
      : trendPct > 0
      ? { label: `↗ +${Math.round(trendPct)}%`, color: '#4CAF50' }
      : { label: `↘ ${Math.round(trendPct)}%`, color: '#E53935' };

  const maxBar = bars.reduce((m, b) => (b.value > m.value ? b : m), bars[0]);
  const unit = metric === 'ml' ? ` ${t('ml')}` : '';
  const periodLabel = period === '90' ? `13 ${t('tendance.weeks')}` : `${period} ${t('tendance.days')}`;
  const isHorizontal = period !== '7';

  // Horizontal chart: bar area = total width minus label & value columns
  const barAreaW = Math.max(chartWidth - LABEL_W - VALUE_W, 0);
  const avgX = avg > 0 ? (avg / maxValue) * barAreaW : null;

  // ── Vertical bar chart (7j) ─────────────────────────────────────────────────
  const renderVertical = () => {
    const avgRatio = avg / maxValue;
    return (
      <View style={{ marginTop: 20, marginBottom: 4 }}>
        <Text style={s.yAxisLabel}>{metric === 'ml' ? t('ml') : t('stats.count').toLowerCase()}</Text>
        <View style={{ height: CHART_H_VERT + 28, position: 'relative' }}>
          {avg > 0 && (
            <View style={[s.vAvgLine, { bottom: 24 + avgRatio * CHART_H_VERT }]} pointerEvents="none">
              <View style={s.vAvgDash} />
              <Text style={s.vAvgLabel}>{t('tendance.avg')} {Math.round(avg)}{unit}</Text>
            </View>
          )}
          <View style={s.vBarsRow}>
            {bars.map((bar, i) => {
              const barH = bar.value > 0 ? Math.max((bar.value / maxValue) * CHART_H_VERT, 4) : 2;
              return (
                <View key={i} style={s.vBarWrapper}>
                  {bar.value > 0 && (
                    <Text style={s.vBarValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                      {Math.round(bar.value)}
                    </Text>
                  )}
                  <View style={[s.vBar, { height: barH, backgroundColor: bar.hasData ? BIBERON_COLOR : '#E0E0E0' }]} />
                  <Text style={s.vBarLabel} numberOfLines={1}>{bar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // ── Horizontal bar chart (30j / 90j) ────────────────────────────────────────
  const renderHorizontal = () => {
    const rowH   = period === '30' ? ROW_H_30 : ROW_H_90;
    const barH   = period === '30' ? BAR_H_30 : BAR_H_90;
    const fSize  = period === '30' ? 7 : 11;

    return (
      <View
        style={{ marginTop: 16 }}
        onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth === 0 ? null : (
          <View style={{ position: 'relative' }}>
            {/* Average vertical dashed line overlay */}
            {avgX !== null && (
              <View
                style={[s.hAvgLine, { left: LABEL_W + avgX, height: bars.length * (rowH + 3) }]}
                pointerEvents="none"
              />
            )}

            {bars.map((bar, i) => {
              const barW = bar.value > 0
                ? Math.max((bar.value / maxValue) * barAreaW, 3)
                : 0;
              const barColor = bar.hasData ? BIBERON_COLOR : '#EEE';
              const valueStr = bar.value > 0 ? String(Math.round(bar.value)) : '—';
              // Highlight every 7th row for 30j
              const isWeekBoundary = period === '30' && i % 7 === 0;

              return (
                <View
                  key={i}
                  style={[
                    s.hRow,
                    { height: rowH + 3, marginBottom: period === '30' ? 0 : 2 },
                    isWeekBoundary && i > 0 && { marginTop: 4 },
                  ]}
                >
                  {/* Label */}
                  <Text style={[s.hLabel, { fontSize: fSize, width: LABEL_W, fontWeight: isWeekBoundary ? '700' : '400' }]} numberOfLines={1}>
                    {period === '90' ? bar.label : (isWeekBoundary ? bar.sublabel : bar.label)}
                  </Text>

                  {/* Bar track */}
                  <View style={[s.hTrack, { height: barH }]}>
                    <View style={[s.hBar, { width: barW, backgroundColor: barColor, height: barH }]} />
                  </View>

                  {/* Value */}
                  <Text style={[s.hValue, { fontSize: fSize, width: VALUE_W, color: bar.hasData ? BIBERON_COLOR : '#CCC' }]} numberOfLines={1}>
                    {valueStr}{bar.hasData ? unit : ''}
                  </Text>
                </View>
              );
            })}

            {/* Average label at bottom of line */}
            {avgX !== null && (
              <Text style={[s.hAvgLabel, { left: LABEL_W + avgX - 12 }]}>
                {t('tendance.avg')}{'\n'}{Math.round(avg)}{unit}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{t('tendance.title')}</Text>

      {/* Period selector */}
      <View style={s.segRow}>
        {(['7', '30', '90'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[s.segBtn, period === p && s.segBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[s.segText, period === p && s.segTextActive]}>
              {t(`tendance.period${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metric toggle */}
      <View style={[s.segRow, { marginTop: 8 }]}>
        <TouchableOpacity style={[s.segBtn, metric === 'ml' && s.segBtnActive]} onPress={() => setMetric('ml')}>
          <Text style={[s.segText, metric === 'ml' && s.segTextActive]}>{t('tendance.volume')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.segBtn, metric === 'count' && s.segBtnActive]} onPress={() => setMetric('count')}>
          <Text style={[s.segText, metric === 'count' && s.segTextActive]}>{t('tendance.bottles')}</Text>
        </TouchableOpacity>
      </View>

      {isHorizontal ? renderHorizontal() : renderVertical()}

      {/* Summary row */}
      <View style={s.summaryRow}>
        <View style={s.summaryBadge}>
          <Text style={s.summaryLabel}>{period === '90' ? t('tendance.avgPerWeek') : t('tendance.avgPerDay')}</Text>
          <Text style={s.summaryValue}>{Math.round(avg)}{unit}</Text>
        </View>
        <View style={s.summaryBadge}>
          <Text style={s.summaryLabel}>{t('tendance.trend')}</Text>
          <Text style={[s.summaryValue, { color: trend.color, fontSize: 13 }]}>{trend.label}</Text>
        </View>
        <View style={s.summaryBadge}>
          <Text style={s.summaryLabel}>{period === '90' ? t('tendance.maxWeek') : t('tendance.maxDay')}</Text>
          <Text style={s.summaryValue}>{Math.round(maxBar?.value ?? 0)}{unit}</Text>
        </View>
      </View>

      <Text style={s.periodNote}>
        {t('tendance.periodNote', {
          label: periodLabel,
          filled: filledBars.length,
          total: bars.length,
          unit: period === '90' ? t('tendance.weeks') : t('tendance.days'),
        })}
      </Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BIBERON_COLOR,
    marginBottom: 16,
  },
  segRow: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  segBtnActive: { backgroundColor: BIBERON_COLOR },
  segText: { fontSize: 13, fontWeight: '600', color: '#7A8889' },
  segTextActive: { color: '#FFF' },

  // ── Vertical chart (7j) ────────────────────────────────────────────────────
  yAxisLabel: { fontSize: 10, color: '#BBB', marginBottom: 2, marginLeft: 2 },
  vBarsRow: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_H_VERT + 28,
  },
  vBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_H_VERT + 28,
  },
  vBarValue: {
    fontSize: 9, fontWeight: '700', color: BIBERON_COLOR,
    marginBottom: 2, width: '100%', textAlign: 'center',
  },
  vBar: { width: '80%', borderRadius: 4, minHeight: 2 },
  vBarLabel: {
    marginTop: 4, fontSize: 9, color: '#AAA', fontWeight: '600',
    width: '100%', textAlign: 'center',
  },
  vAvgLine: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1,
  },
  vAvgDash: {
    flex: 1, height: 1,
    borderStyle: 'dashed', borderWidth: 1, borderColor: '#E29656',
  },
  vAvgLabel: { fontSize: 9, color: '#E29656', fontWeight: '700' },

  // ── Horizontal chart (30j / 90j) ──────────────────────────────────────────
  hRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hLabel: {
    color: '#888',
    textAlign: 'right',
    paddingRight: 6,
  },
  hTrack: {
    flex: 1,
    backgroundColor: '#F4F4F4',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hBar: {
    borderRadius: 3,
  },
  hValue: {
    textAlign: 'right',
    fontWeight: '600',
    paddingLeft: 4,
  },
  hAvgLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    borderStyle: 'dashed',
    borderLeftWidth: 1,
    borderColor: '#E29656',
    zIndex: 2,
  },
  hAvgLabel: {
    position: 'absolute',
    fontSize: 7,
    color: '#E29656',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Summary ────────────────────────────────────────────────────────────────
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  summaryBadge: {
    flex: 1, backgroundColor: BG, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', gap: 4,
  },
  summaryLabel: { fontSize: 10, color: '#999', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: BIBERON_COLOR },
  periodNote: { marginTop: 10, fontSize: 10, color: '#CCC', textAlign: 'center' },
});
