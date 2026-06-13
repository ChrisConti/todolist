import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SleepGroupData } from '../../hooks/useTaskStatistics';

const BAR_MAX_HEIGHT = 120;
const NIGHT_COLOR    = '#4F469F';
const NAP_COLOR      = '#A89FD8';

const fmtShort = (min: number): string => {
  if (min === 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h`;
};

interface Props {
  groups: SleepGroupData[];
}

const SleepStackedChart: React.FC<Props> = ({ groups }) => {
  const { t } = useTranslation();
  const getAvg = (g: SleepGroupData) =>
    g.daysCount > 0 ? Math.round((g.nightMinutes + g.napMinutes) / g.daysCount) : 0;
  const getNightAvg = (g: SleepGroupData) =>
    g.daysCount > 0 ? Math.round(g.nightMinutes / g.daysCount) : 0;
  const maxAvg = Math.max(...groups.map(getAvg), 1);

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: NIGHT_COLOR }]} />
          <Text style={styles.legendTxt}>🌙 {t('sleepAdvanced.nightLabel')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: NAP_COLOR }]} />
          <Text style={styles.legendTxt}>😴 {t('sleepAdvanced.napLabel')}</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {groups.map((g, i) => {
          const avg        = getAvg(g);
          const nightAvg   = getNightAvg(g);
          const totalH     = avg > 0 ? (avg / maxAvg) * BAR_MAX_HEIGHT : 0;
          const nightH     = avg > 0 ? (nightAvg / avg) * totalH : 0;
          const napH       = totalH - nightH;
          const isMax      = avg === maxAvg && avg > 0;
          const napRadius  = napH > 0 ? 4 : 0;
          const nightTopR  = napH === 0 ? 4 : 0;

          return (
            <View key={i} style={styles.col}>
              {avg > 0 && <Text style={styles.valAbove}>{fmtShort(avg)}</Text>}
              <View style={styles.barWrap}>
                <View style={{ height: totalH, width: 28, opacity: isMax ? 1 : 0.72 }}>
                  {napH > 0 && (
                    <View style={{ height: napH, backgroundColor: NAP_COLOR, borderTopLeftRadius: napRadius, borderTopRightRadius: napRadius }} />
                  )}
                  {nightH > 0 && (
                    <View style={{ height: nightH, backgroundColor: NIGHT_COLOR, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: nightTopR, borderTopRightRadius: nightTopR }} />
                  )}
                </View>
              </View>
              <Text style={styles.label}>{g.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  legend:     { flexDirection: 'row', gap: 16, marginBottom: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  legendTxt:  { fontSize: 12, color: '#666' },
  chart:      {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 44,
    backgroundColor: '#F5EDE4',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 24,
  },
  col:        { alignItems: 'center', flex: 1 },
  barWrap:    { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  valAbove:   { fontSize: 10, color: '#555', fontWeight: '600', marginBottom: 2 },
  label:      { marginTop: 5, fontSize: 10, color: '#7A8889', fontWeight: '500' },
});

export default SleepStackedChart;
