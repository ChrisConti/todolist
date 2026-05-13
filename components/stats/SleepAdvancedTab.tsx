import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Task } from '../../types/stats';
import { useSommeilAdvancedStats, SleepPeriod } from '../../hooks/useTaskStatistics';
import SleepOmsBlock from './SleepOmsBlock';
import SleepStackedChart from './SleepStackedChart';
import SleepFeedbackWidget from './SleepFeedbackWidget';

const PERIODS: SleepPeriod[] = [7, 30, 60, 90];

interface Props {
  tasks: Task[];
  babyName?: string;
  babyBirthDate?: string;
  userId?: string;
}

const SleepAdvancedTab: React.FC<Props> = ({ tasks, babyName, babyBirthDate, userId }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<SleepPeriod>(7);

  const stats = useSommeilAdvancedStats(tasks, period);

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
            babyName={babyName}
            babyBirthDate={babyBirthDate}
            avgTotalMin={stats.avgTotalPerDay}
            avgNightMin={stats.avgNightPerDay}
            avgNapMin={stats.avgNapPerDay}
            period={period}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('sleepAdvanced.evolutionTitle', { period })}
            </Text>
            <SleepStackedChart groups={stats.groups} />
          </View>

          <SleepFeedbackWidget userId={userId} />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 32 },
  periodRow: {
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
  section:         { marginBottom: 16 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyTxt:        { fontSize: 14, color: '#7A8889', textAlign: 'center' },
});

export default SleepAdvancedTab;
