import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

interface Props {
  tasks: any[];
}

const BIBERON_COLOR = '#34777B';
const BG = '#FDF1E7';
const REGULARITY_WINDOW = 30; // ±30 min around average = "regular"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotStats {
  name: string;
  emoji: string;
  range: string;
  avgPerDay: number;
  avg: number | null;     // minutes
  min: number | null;
  max: number | null;
  regularity: number | null; // 0–100
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDuration = (min: number): string => {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

const fmtClock = (totalMin: number): string => {
  const h = Math.floor(totalMin / 60) % 24;
  const m = Math.round(totalMin % 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
};

const regularity = (intervals: number[]): number | null => {
  if (intervals.length < 2) return null;
  const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const within = intervals.filter(v => Math.abs(v - avg) <= REGULARITY_WINDOW).length;
  return Math.round((within / intervals.length) * 100);
};

const regularityColor = (r: number | null): string => {
  if (r === null) return '#CCC';
  if (r >= 75) return '#4CAF50';
  if (r >= 50) return '#E29656';
  return '#E53935';
};

const regularityLabel = (r: number | null, t: (key: string) => string): string => {
  if (r === null) return '—';
  if (r >= 75) return t('rythme.regular');
  if (r >= 50) return t('rythme.variable');
  return t('rythme.irregular');
};

type SlotKey = 'morning' | 'afternoon' | 'evening' | 'night';

const getSlot = (h: number): SlotKey => {
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

// ─── Component ────────────────────────────────────────────────────────────────

export const RythmeChart: React.FC<Props> = ({ tasks }) => {
  const { t } = useTranslation();
  const [showTip, setShowTip] = useState(false);

  const stats = useMemo(() => {
    const cutoff = moment().subtract(7, 'days').startOf('day');
    const recent = tasks
      .filter(t => moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSameOrAfter(cutoff))
      .sort((a, b) =>
        moment(a.date, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.date, 'YYYY-MM-DD HH:mm:ss'))
      );

    if (recent.length < 2) return null;

    // ── All consecutive intervals ──────────────────────────────────────────
    const allIntervals: { minutes: number; slot: SlotKey }[] = [];
    for (let i = 1; i < recent.length; i++) {
      const m1 = moment(recent[i - 1].date, 'YYYY-MM-DD HH:mm:ss');
      const m2 = moment(recent[i].date, 'YYYY-MM-DD HH:mm:ss');
      const diff = m2.diff(m1, 'minutes');
      // Ignore gaps > 16h (probably cross-day outliers / missing data)
      if (diff > 0 && diff <= 960) {
        allIntervals.push({ minutes: diff, slot: getSlot(m1.hours()) });
      }
    }

    if (allIntervals.length === 0) return null;

    const allMin = allIntervals.map(i => i.minutes);

    // ── Global stats ──────────────────────────────────────────────────────
    const globalAvg = Math.round(allMin.reduce((s, v) => s + v, 0) / allMin.length);
    const globalMin = Math.min(...allMin);
    const globalMax = Math.max(...allMin);
    const globalReg = regularity(allMin);

    // ── Auto-detected active window ───────────────────────────────────────
    const byDay: Record<string, moment.Moment[]> = {};
    recent.forEach(t => {
      const key = moment(t.date, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(moment(t.date, 'YYYY-MM-DD HH:mm:ss'));
    });
    const days = Object.values(byDay);
    const firstTimes = days.map(d => d[0].hours() * 60 + d[0].minutes());
    const lastTimes  = days.map(d => d[d.length - 1].hours() * 60 + d[d.length - 1].minutes());
    const avgFirst = firstTimes.reduce((s, v) => s + v, 0) / firstTimes.length;
    const avgLast  = lastTimes.reduce((s, v) => s + v, 0) / lastTimes.length;

    // Intervals during active window vs outside
    const activeIntervals = allIntervals
      .filter(i => {
        const slot = i.slot;
        return slot !== 'night';
      })
      .map(i => i.minutes);
    const nightIntervals = allIntervals
      .filter(i => i.slot === 'night')
      .map(i => i.minutes);
    const activeAvg = activeIntervals.length
      ? Math.round(activeIntervals.reduce((s, v) => s + v, 0) / activeIntervals.length)
      : null;
    const nightAvg = nightIntervals.length
      ? Math.round(nightIntervals.reduce((s, v) => s + v, 0) / nightIntervals.length)
      : null;

    // ── Per-slot stats ────────────────────────────────────────────────────
    const slotDefs: { key: SlotKey; nameKey: string; emoji: string; range: string }[] = [
      { key: 'morning',   nameKey: 'rythme.morning',   emoji: '🌅', range: '06h–12h' },
      { key: 'afternoon', nameKey: 'rythme.afternoon', emoji: '☀️',  range: '12h–18h' },
      { key: 'evening',   nameKey: 'rythme.evening',   emoji: '🌆', range: '18h–22h' },
      { key: 'night',     nameKey: 'rythme.night',     emoji: '🌙', range: '22h–06h' },
    ];

    // Count bottles per slot across 7 days
    const slotCounts: Record<SlotKey, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    recent.forEach(t => {
      slotCounts[getSlot(moment(t.date, 'YYYY-MM-DD HH:mm:ss').hours())]++;
    });

    const slotStats: SlotStats[] = slotDefs.map(({ key, nameKey, emoji, range }) => {
      const ints = allIntervals.filter(i => i.slot === key).map(i => i.minutes);
      return {
        name: nameKey, emoji, range,
        avgPerDay: Math.round((slotCounts[key] / 7) * 10) / 10,
        avg: ints.length ? Math.round(ints.reduce((s, v) => s + v, 0) / ints.length) : null,
        min: ints.length ? Math.min(...ints) : null,
        max: ints.length ? Math.max(...ints) : null,
        regularity: regularity(ints),
      };
    });

    return {
      global: { avg: globalAvg, min: globalMin, max: globalMax, regularity: globalReg },
      activeWindow: { from: avgFirst, to: avgLast, activeAvg, nightAvg },
      slots: slotStats,
      totalBottlesPerDay: Math.round((recent.length / 7) * 10) / 10,
    };
  }, [tasks]);

  if (!stats) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('rythme.title')}</Text>
        <Text style={s.empty}>{t('rythme.notEnoughData')}</Text>
      </View>
    );
  }

  const { global: g, activeWindow: aw, slots } = stats;

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{t('rythme.title')}</Text>
      <Text style={s.subtitle}>{t('rythme.subtitle', { count: stats.totalBottlesPerDay })}</Text>

      {/* ── Section 1 : Intervalles globaux ─────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('rythme.globalIntervals')}</Text>
        <View style={s.metricsRow}>
          <View style={s.metricBox}>
            <Text style={s.metricLabel}>{t('rythme.average')}</Text>
            <Text style={s.metricValue}>{fmtDuration(g.avg)}</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.metricLabel}>{t('rythme.shortest')}</Text>
            <Text style={[s.metricValue, { color: '#E29656' }]}>{fmtDuration(g.min)}</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.metricLabel}>{t('rythme.longest')}</Text>
            <Text style={[s.metricValue, { color: '#6B8DEA' }]}>{fmtDuration(g.max)}</Text>
          </View>
          <TouchableOpacity style={s.metricBox} onPress={() => setShowTip(v => !v)}>
            <View style={s.metricLabelRow}>
              <Text style={s.metricLabel}>{t('rythme.regularity')}</Text>
              <Text style={s.infoIcon}>ⓘ</Text>
            </View>
            <Text style={[s.metricValue, { color: regularityColor(g.regularity) }]}>
              {g.regularity !== null ? `${g.regularity}%` : '—'}
            </Text>
            <Text style={[s.metricSub, { color: regularityColor(g.regularity) }]}>
              {regularityLabel(g.regularity, t)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tooltip */}
        {showTip && (
          <View style={s.tooltip}>
            <Text style={s.tooltipText}>
              <Text style={{ fontWeight: '700' }}>{t('rythme.regularity')}</Text>
              {' '}{t('rythme.tooltipDesc')}{'\n\n'}
              <Text style={{ color: '#4CAF50', fontWeight: '700' }}>≥ 75%</Text> {t('rythme.tooltipRegular')}{'\n'}
              <Text style={{ color: '#E29656', fontWeight: '700' }}>50–74%</Text> {t('rythme.tooltipVariable')}{'\n'}
              <Text style={{ color: '#E53935', fontWeight: '700' }}>&lt; 50%</Text> {t('rythme.tooltipIrregular')}
            </Text>
            <TouchableOpacity onPress={() => setShowTip(false)} style={s.tooltipClose}>
              <Text style={s.tooltipCloseText}>{t('rythme.close')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Section 2 : Plage active ─────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('rythme.activeWindow')}</Text>
        <View style={s.activeWindowRow}>
          <View style={s.awBadge}>
            <Text style={s.awLabel}>{t('rythme.firstBottle')}</Text>
            <Text style={s.awValue}>{fmtClock(aw.from)}</Text>
          </View>
          <Text style={s.awArrow}>→</Text>
          <View style={s.awBadge}>
            <Text style={s.awLabel}>{t('rythme.lastBottle')}</Text>
            <Text style={s.awValue}>{fmtClock(aw.to)}</Text>
          </View>
        </View>
        <View style={s.activeIntervalRow}>
          <View style={[s.aiChip, { backgroundColor: '#EBF5F5' }]}>
            <Text style={s.aiChipLabel}>{t('rythme.dayInterval')}</Text>
            <Text style={[s.aiChipValue, { color: BIBERON_COLOR }]}>
              {aw.activeAvg ? fmtDuration(aw.activeAvg) : '—'}
            </Text>
          </View>
          <View style={[s.aiChip, { backgroundColor: '#F0EEF9' }]}>
            <Text style={s.aiChipLabel}>{t('rythme.nightInterval')}</Text>
            <Text style={[s.aiChipValue, { color: '#4F469F' }]}>
              {aw.nightAvg ? fmtDuration(aw.nightAvg) : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Section 3 : Par tranche horaire ──────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('rythme.byTimeSlot')}</Text>
        {slots.map((slot) => {
          const reg = slot.regularity;
          const regColor = regularityColor(reg);
          const hasData = slot.avg !== null;

          return (
            <View key={slot.name} style={s.slotCard}>
              {/* Header */}
              <View style={s.slotHeader}>
                <Text style={s.slotTitle}>{slot.emoji} {t(slot.name)}</Text>
                <Text style={s.slotRange}>{slot.range}</Text>
                <View style={s.slotCountBadge}>
                  <Text style={s.slotCount}>{slot.avgPerDay} {t('rythme.bottlesPerDay')}</Text>
                </View>
              </View>

              {!hasData ? (
                <Text style={s.slotEmpty}>{t('rythme.noDataForSlot')}</Text>
              ) : (
                <View style={s.slotMetrics}>
                  <View style={s.slotMetricItem}>
                    <Text style={s.slotMetricLabel}>{t('rythme.avg')}</Text>
                    <Text style={s.slotMetricValue}>{fmtDuration(slot.avg!)}</Text>
                  </View>
                  <View style={s.slotDivider} />
                  <View style={s.slotMetricItem}>
                    <Text style={s.slotMetricLabel}>{t('rythme.short')}</Text>
                    <Text style={[s.slotMetricValue, { color: '#E29656' }]}>{fmtDuration(slot.min!)}</Text>
                  </View>
                  <View style={s.slotDivider} />
                  <View style={s.slotMetricItem}>
                    <Text style={s.slotMetricLabel}>{t('rythme.long')}</Text>
                    <Text style={[s.slotMetricValue, { color: '#6B8DEA' }]}>{fmtDuration(slot.max!)}</Text>
                  </View>
                  <View style={s.slotDivider} />
                  <View style={s.slotMetricItem}>
                    <Text style={s.slotMetricLabel}>{t('rythme.regularity')}</Text>
                    <Text style={[s.slotMetricValue, { color: regColor }]}>
                      {reg !== null ? `${reg}%` : '—'}
                    </Text>
                    <Text style={[s.slotMetricSub, { color: regColor }]}>
                      {regularityLabel(reg, t)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
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
    fontSize: 16, fontWeight: '700', color: BIBERON_COLOR, marginBottom: 4,
  },
  subtitle: {
    fontSize: 12, color: '#AAA', marginBottom: 16,
  },
  empty: {
    color: '#BBB', fontSize: 13, textAlign: 'center', paddingVertical: 20,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#BBB',
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10,
  },

  // Section 1 — global metrics
  metricsRow: {
    flexDirection: 'row', gap: 6,
  },
  metricBox: {
    flex: 1, backgroundColor: BG, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 2,
  },
  metricLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  metricLabel: {
    fontSize: 9, color: '#999', fontWeight: '500', textAlign: 'center',
  },
  metricValue: {
    fontSize: 15, fontWeight: '800', color: BIBERON_COLOR, textAlign: 'center',
  },
  metricSub: {
    fontSize: 8, fontWeight: '600', textAlign: 'center',
  },
  infoIcon: {
    fontSize: 10, color: '#AAA',
  },

  // Tooltip
  tooltip: {
    marginTop: 10, backgroundColor: '#F8F8F8', borderRadius: 10,
    padding: 14, borderLeftWidth: 3, borderLeftColor: BIBERON_COLOR,
  },
  tooltipText: {
    fontSize: 12, color: '#555', lineHeight: 18,
  },
  tooltipClose: {
    marginTop: 10, alignSelf: 'flex-end',
  },
  tooltipCloseText: {
    fontSize: 12, color: BIBERON_COLOR, fontWeight: '700',
  },

  // Section 2 — active window
  activeWindowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  awBadge: {
    flex: 1, backgroundColor: BG, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  awLabel: { fontSize: 10, color: '#999' },
  awValue: { fontSize: 20, fontWeight: '800', color: BIBERON_COLOR, marginTop: 2 },
  awArrow: { fontSize: 18, color: '#CCC' },
  activeIntervalRow: {
    flexDirection: 'row', gap: 8,
  },
  aiChip: {
    flex: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  aiChipLabel: { fontSize: 11, color: '#777', fontWeight: '500' },
  aiChipValue: { fontSize: 15, fontWeight: '800' },

  // Section 3 — slot cards
  slotCard: {
    backgroundColor: BG, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  slotHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6,
  },
  slotTitle: {
    fontSize: 13, fontWeight: '700', color: '#444', flex: 1,
  },
  slotRange: {
    fontSize: 11, color: '#AAA',
  },
  slotCountBadge: {
    backgroundColor: BIBERON_COLOR + '20', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  slotCount: {
    fontSize: 11, fontWeight: '700', color: BIBERON_COLOR,
  },
  slotEmpty: {
    fontSize: 11, color: '#BBB', fontStyle: 'italic',
  },
  slotMetrics: {
    flexDirection: 'row', alignItems: 'flex-start',
  },
  slotMetricItem: {
    flex: 1, alignItems: 'center', gap: 2,
  },
  slotMetricLabel: {
    fontSize: 9, color: '#AAA', fontWeight: '500',
  },
  slotMetricValue: {
    fontSize: 13, fontWeight: '800', color: BIBERON_COLOR, textAlign: 'center',
  },
  slotMetricSub: {
    fontSize: 8, fontWeight: '600', textAlign: 'center',
  },
  slotDivider: {
    width: 1, backgroundColor: '#DDD', alignSelf: 'stretch', marginHorizontal: 2,
  },
});
