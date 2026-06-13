import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { Task } from '../../types/stats';
import { useSommeilAdvancedStats, SleepPeriod } from '../../hooks/useTaskStatistics';
import SleepOmsBlock from './SleepOmsBlock';
import SleepStackedChart from './SleepStackedChart';
import SleepFeedbackWidget from './SleepFeedbackWidget';

const PERIODS: SleepPeriod[] = [7, 30, 60, 90];

const OMS_TOTAL = [
  { maxMonths: 4,   totalMin: 14 * 60 },
  { maxMonths: 12,  totalMin: 12 * 60 },
  { maxMonths: 24,  totalMin: 11 * 60 },
  { maxMonths: 999, totalMin: 10 * 60 },
];
const getOmsMin = (birthDate?: string): number => {
  if (!birthDate) return OMS_TOTAL[1].totalMin;
  const ageMonths = moment().diff(moment(birthDate), 'months');
  return (OMS_TOTAL.find(r => ageMonths < r.maxMonths) ?? OMS_TOTAL[3]).totalMin;
};

interface Props {
  tasks: Task[];
  babyName?: string;
  babyBirthDate?: string;
  userId?: string;
}

const PREVIEW_CELL = 13;
const PREVIEW_GAP  = 2;

const SleepAdvancedTab: React.FC<Props> = ({ tasks, babyBirthDate, userId }) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [period, setPeriod] = useState<SleepPeriod>(7);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const stats       = useSommeilAdvancedStats(tasks, period);
  const omsMinTotal = getOmsMin(babyBirthDate);

  // ── Shared heatmap data ───────────────────────────────────────────────────
  const today       = moment();
  const startDay    = moment().subtract(period - 1, 'days').startOf('day');
  const startMonday = startDay.clone().startOf('isoWeek');
  const endMonday   = today.clone().startOf('isoWeek');
  const numWeeks    = endMonday.diff(startMonday, 'weeks') + 1;
  const DAY_LABELS  = Array.from({ length: 7 }, (_, i) =>
    moment().isoWeekday(i + 1).format('dd').charAt(0).toUpperCase()
  );
  const dailyMap    = new Map((stats.dailyTotals ?? []).map(d => [d.date, d.totalMin]));
  const labelEvery  = numWeeks > 10 ? 3 : numWeeks > 5 ? 2 : 1;

  const getCellInfo = (wi: number, dow: number) => {
    const date       = startMonday.clone().add(wi, 'weeks').add(dow, 'days');
    const outOfRange = date.isBefore(startDay, 'day') || date.isAfter(today, 'day');
    const totalMin   = dailyMap.get(date.format('YYYY-MM-DD')) ?? 0;
    let bg = outOfRange ? 'transparent' : '#EBEBEB';
    if (!outOfRange && totalMin > 0) bg = totalMin >= omsMinTotal ? '#81C784' : '#EF9A9A';
    return { bg, totalMin, outOfRange };
  };

  // ── Preview mini-grid (fixed 13px cells, always portrait orientation) ─────
  const renderPreviewGrid = () => (
    <View>
      {Array.from({ length: 7 }, (_, dow) => (
        <View key={dow} style={{ flexDirection: 'row', marginBottom: dow < 6 ? PREVIEW_GAP : 0 }}>
          {Array.from({ length: numWeeks }, (_, wi) => {
            const { bg } = getCellInfo(wi, dow);
            return (
              <View
                key={wi}
                style={{
                  width: PREVIEW_CELL,
                  height: PREVIEW_CELL,
                  borderRadius: 3,
                  backgroundColor: bg,
                  marginLeft: wi > 0 ? PREVIEW_GAP : 0,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );

  // ── Fullscreen heatmap — rotated -90° so user turns phone to read ────────
  // App is locked portrait, so we pre-rotate. User turns +90° → rotations cancel.
  const renderFullHeatmap = () => {
    // containerW/H = portrait screen dimensions
    const cW    = width;
    const cH    = height;
    // Inner view (landscape coords): width=cH, height=cW
    const lPad  = 16;
    const lblW  = 30;
    const gap   = 3;
    const hdrH  = 22;
    const legH  = 28;

    const cellW = Math.min(
      Math.floor((cH - lPad * 2 - lblW - (numWeeks - 1) * gap) / numWeeks),
      80,
    );
    const cellH = Math.floor((cW - lPad * 2 - hdrH - legH - 6 * gap) / 7);
    const showTxt = cellW >= 28 && cellH >= 16;

    const offsetLeft = (cW - cH) / 2;
    const offsetTop  = (cH - cW) / 2;

    return (
      <View style={{ width: cW, height: cH, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute',
          width: cH,
          height: cW,
          left: offsetLeft,
          top: offsetTop,
          transform: [{ rotate: '-90deg' }],
          paddingHorizontal: lPad,
          paddingVertical: lPad,
        }}>
          {/* Header: week start dates */}
          <View style={{ flexDirection: 'row', height: hdrH, alignItems: 'center' }}>
            <View style={{ width: lblW }} />
            {Array.from({ length: numWeeks }, (_, wi) => (
              <View key={wi} style={{ width: cellW, marginLeft: wi > 0 ? gap : 0, alignItems: 'center' }}>
                <Text style={hStyles.weekLabel}>
                  {wi % labelEvery === 0 ? startMonday.clone().add(wi, 'weeks').format('D/M') : ''}
                </Text>
              </View>
            ))}
          </View>
          {/* Rows: Mon → Sun */}
          {DAY_LABELS.map((dayLabel, dow) => (
            <View key={dow} style={[hStyles.heatRow, { marginTop: gap }]}>
              <Text style={[hStyles.dayLabel, { width: lblW }]}>{dayLabel}</Text>
              {Array.from({ length: numWeeks }, (_, wi) => {
                const { bg, totalMin, outOfRange } = getCellInfo(wi, dow);
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                const lbl = m === 0 ? `${h}h` : `${h}h${m}`;
                return (
                  <View key={wi} style={[hStyles.cell, { width: cellW, height: cellH, backgroundColor: bg, marginLeft: wi > 0 ? gap : 0 }]}>
                    {showTxt && !outOfRange && totalMin > 0 && (
                      <Text style={hStyles.cellText}>{lbl}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          {/* Legend */}
          <View style={[hStyles.legend, { marginTop: 8 }]}>
            <View style={[hStyles.dot, { backgroundColor: '#81C784' }]} />
            <Text style={hStyles.legendTxt}>{t('sleepAdvanced.heatOk')}</Text>
            <View style={[hStyles.dot, { backgroundColor: '#EF9A9A', marginLeft: 14 }]} />
            <Text style={hStyles.legendTxt}>{t('sleepAdvanced.heatNok')}</Text>
            <View style={[hStyles.dot, { backgroundColor: '#EBEBEB', marginLeft: 14 }]} />
            <Text style={hStyles.legendTxt}>{t('sleepAdvanced.heatNoData')}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodTxt, period === p && styles.periodTxtActive]}>
              {t(`sleepAdvanced.period${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!stats.hasData ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>{t('sleepAdvanced.noData')}</Text>
        </View>
      ) : (
        <>
          <SleepOmsBlock
            babyBirthDate={babyBirthDate}
            avgTotalMin={stats.avgTotalPerDay}
            avgNightMin={stats.avgNightPerDay}
            avgNapMin={stats.avgNapPerDay}
            period={period}
            daysWithData={stats.daysWithData}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('sleepAdvanced.evolutionTitle', { period })}
            </Text>
            <SleepStackedChart groups={stats.groups} />
          </View>

          {/* Calendar preview card — acts as the entry point to fullscreen heatmap */}
          <TouchableOpacity
            style={styles.previewCard}
            onPress={() => setShowHeatmap(true)}
            activeOpacity={0.97}
          >
            {/* Real mini-grid, same data as fullscreen */}
            <View style={styles.previewGrid}>
              {renderPreviewGrid()}
            </View>
            {/* Semi-transparent veil + CTA */}
            <View style={[StyleSheet.absoluteFillObject, styles.previewVeil]}>
              <View style={styles.previewCta}>
                <Ionicons name="calendar-outline" size={18} color="#4F469F" />
                <Text style={styles.previewCtaTxt}>{t('sleepAdvanced.seeGraph')}</Text>
                <Ionicons name="chevron-forward" size={15} color="#4F469F" />
              </View>
            </View>
          </TouchableOpacity>

          <SleepFeedbackWidget userId={userId} />
        </>
      )}

      {/* Fullscreen heatmap modal — turn phone to landscape to read */}
      <Modal
        visible={showHeatmap}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowHeatmap(false)}
        statusBarTranslucent
      >
        <View style={styles.modalFull}>
          {renderFullHeatmap()}
          {/* Close button — absolutely over the rotated content */}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowHeatmap(false)}>
            <Ionicons name="close-circle" size={30} color="#555" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll:          { flex: 1 },
  content:         { padding: 16, paddingBottom: 32 },
  periodRow:       {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    gap: 3,
  },
  periodBtn:       { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#4F469F' },
  periodTxt:       { fontSize: 13, fontWeight: '600', color: '#7A8889' },
  periodTxtActive: { color: '#FFF' },
  section:         { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 16 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyTxt:        { fontSize: 14, color: '#7A8889', textAlign: 'center' },
  // Preview card
  previewCard:     {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewGrid:     { padding: 16, alignItems: 'center' },
  previewVeil:     {
    backgroundColor: 'rgba(255,255,255,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCta:      {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#4F469F',
    shadowColor: '#4F469F',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  previewCtaTxt:   { fontSize: 14, fontWeight: '700', color: '#4F469F' },
  // Fullscreen modal
  modalFull:       { flex: 1, backgroundColor: '#FFF' },
  modalCloseBtn:   { position: 'absolute', top: 48, right: 16, zIndex: 10 },
});

const hStyles = StyleSheet.create({
  heatRow:   { flexDirection: 'row', alignItems: 'center' },
  weekLabel: { fontSize: 9, color: '#AAA', textAlign: 'center' },
  dayLabel:  { fontSize: 11, color: '#777', textAlign: 'center' },
  cell:      { borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  cellText:  { fontSize: 9, fontWeight: '700', color: '#FFF' },
  legend:    { flexDirection: 'row', alignItems: 'center' },
  dot:       { width: 10, height: 10, borderRadius: 2 },
  legendTxt: { fontSize: 11, color: '#777', marginLeft: 4 },
});

export default SleepAdvancedTab;
