import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SleepPeriod } from '../../hooks/useTaskStatistics';

const OMS_DATA = [
  { maxMonths: 4,   totalMin: 14 * 60, totalMax: 17 * 60, nightMin: 8 * 60,  nightMax: 9 * 60  },
  { maxMonths: 12,  totalMin: 12 * 60, totalMax: 15 * 60, nightMin: 9 * 60,  nightMax: 10 * 60 },
  { maxMonths: 24,  totalMin: 11 * 60, totalMax: 14 * 60, nightMin: 10 * 60, nightMax: 11 * 60 },
  { maxMonths: 999, totalMin: 10 * 60, totalMax: 13 * 60, nightMin: 10 * 60, nightMax: 11 * 60 },
];

const getOmsRec = (birthDate?: string) => {
  if (!birthDate) return OMS_DATA[1];
  const ageMonths = moment().diff(moment(birthDate), 'months');
  return OMS_DATA.find(r => ageMonths < r.maxMonths) ?? OMS_DATA[3];
};

const getBabyAge = (birthDate?: string): string => {
  if (!birthDate) return '';
  const months = moment().diff(moment(birthDate), 'months');
  if (months < 1) return '< 1 mois';
  if (months < 24) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} ans ${rem} mois` : `${years} ans`;
};

const fmt = (min: number): string => {
  if (min === 0) return '--';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
};

const getStatus = (avg: number, min: number, max: number) => {
  if (avg === 0)        return { icon: '—',  color: '#999',     key: 'statusInsufficient' };
  if (avg < min * 0.85) return { icon: '❌', color: '#C75B4A', key: 'statusInsufficient' };
  if (avg < min)        return { icon: '⚠️', color: '#E29656', key: 'statusShort'        };
  return                       { icon: '✅', color: '#4CAF50', key: 'statusOk'           };
};

interface Props {
  babyName?: string;
  babyBirthDate?: string;
  avgTotalMin: number;
  avgNightMin: number;
  avgNapMin: number;
  period: SleepPeriod;
}

const SleepOmsBlock: React.FC<Props> = ({ babyName, babyBirthDate, avgTotalMin, avgNightMin, avgNapMin, period }) => {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);

  const rec    = getOmsRec(babyBirthDate);
  const age    = getBabyAge(babyBirthDate);
  const status = getStatus(avgTotalMin, rec.totalMin, rec.totalMax);
  const barW   = rec.totalMax > 0 ? Math.min(1, avgTotalMin / rec.totalMax) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.babyLabel}>
          👶 {babyName ?? ''}{age ? ` · ${age}` : ''}
        </Text>
        <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#7A8889" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.omsLabel}>{t('sleepAdvanced.omsTitle')}</Text>
      <Text style={styles.omsRange}>
        {t('sleepAdvanced.omsTotal', { min: Math.floor(rec.totalMin / 60), max: Math.floor(rec.totalMax / 60) })}
      </Text>

      <Text style={styles.avgLabel}>
        {t('sleepAdvanced.avgPeriod', { period })}{' '}
        <Text style={[styles.avgValue, { color: status.color }]}>{fmt(avgTotalMin)}</Text>
      </Text>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${barW * 100}%`, backgroundColor: status.color }]} />
        <View style={[styles.marker, { left: `${(rec.totalMin / rec.totalMax) * 100}%` as any }]} />
      </View>

      <Text style={styles.statusText}>{status.icon} {t(`sleepAdvanced.${status.key}`)}</Text>

      <View style={styles.breakdown}>
        <Text style={styles.breakdownText}>🌙 {fmt(avgNightMin)}  {t('sleepAdvanced.nightLabel')}</Text>
        <Text style={styles.breakdownText}>😴 {fmt(avgNapMin)}  {t('sleepAdvanced.napLabel')}</Text>
      </View>

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('sleepAdvanced.omsInfoTitle')}</Text>
            <Text style={styles.modalText}>{t('sleepAdvanced.omsInfoText')}</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more')}>
              <Text style={styles.modalLink}>{t('sleepAdvanced.omsInfoLink')} →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowInfo(false)}>
              <Text style={styles.modalCloseTxt}>{t('sleepAdvanced.omsInfoClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  babyLabel:      { fontSize: 15, fontWeight: '700', color: '#333' },
  divider:        { height: 1, backgroundColor: '#EEE', marginBottom: 12 },
  omsLabel:       { fontSize: 11, color: '#7A8889', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  omsRange:       { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 10 },
  avgLabel:       { fontSize: 14, color: '#555', marginBottom: 8 },
  avgValue:       { fontWeight: '700' },
  barBg:          { height: 10, backgroundColor: '#EEE', borderRadius: 5, marginBottom: 6, overflow: 'visible' as any },
  barFill:        { height: 10, borderRadius: 5, position: 'absolute', left: 0, top: 0 },
  marker:         { position: 'absolute', top: -2, bottom: -2, width: 2, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 1 },
  statusText:     { fontSize: 13, color: '#555', marginTop: 6, marginBottom: 12 },
  breakdown:      { backgroundColor: '#F8F0E8', borderRadius: 10, padding: 12, gap: 6 },
  breakdownText:  { fontSize: 14, color: '#444' },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modal:          { backgroundColor: '#FDF1E7', borderRadius: 16, padding: 20, width: '82%', maxWidth: 340 },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  modalText:      { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  modalLink:      { fontSize: 14, color: '#C75B4A', fontWeight: '600', marginBottom: 16 },
  modalCloseBtn:  { backgroundColor: '#C75B4A', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modalCloseTxt:  { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

export default SleepOmsBlock;
