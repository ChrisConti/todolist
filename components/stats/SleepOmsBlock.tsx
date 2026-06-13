import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SleepPeriod } from '../../hooks/useTaskStatistics';

const OMS_DATA = [
  { maxMonths: 4,   totalMin: 14*60, totalMax: 17*60, nightMin: 8*60,  nightMax: 9*60,  napsMin: 3, napsMax: 5 },
  { maxMonths: 12,  totalMin: 12*60, totalMax: 15*60, nightMin: 9*60,  nightMax: 10*60, napsMin: 2, napsMax: 3 },
  { maxMonths: 24,  totalMin: 11*60, totalMax: 14*60, nightMin: 10*60, nightMax: 11*60, napsMin: 1, napsMax: 2 },
  { maxMonths: 999, totalMin: 10*60, totalMax: 13*60, nightMin: 10*60, nightMax: 11*60, napsMin: 0, napsMax: 1 },
];

const MIN_DAYS_REQUIRED: Record<number, number> = { 7: 3, 30: 10, 60: 20, 90: 30 };

const getOmsRec = (birthDate?: string) => {
  if (!birthDate) return OMS_DATA[1];
  const ageMonths = moment().diff(moment(birthDate), 'months');
  return OMS_DATA.find(r => ageMonths < r.maxMonths) ?? OMS_DATA[3];
};

const getBabyAge = (birthDate?: string): string => {
  if (!birthDate) return '';
  const birth = moment(birthDate);
  if (!birth.isValid()) return '';
  const months = moment().diff(birth, 'months');
  if (isNaN(months) || months < 0) return '';
  if (months < 1) return '< 1 mois';
  if (months < 12) return `${months} mois`;
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
  if (avg === 0)        return { key: 'statusInsufficient', color: '#999',     bg: '#F5F5F5' };
  if (avg < min * 0.85) return { key: 'statusInsufficient', color: '#C62828',  bg: '#FFEBEE' };
  if (avg < min)        return { key: 'statusShort',        color: '#E65100',  bg: '#FFF3E0' };
  return                       { key: 'statusOk',           color: '#1B5E20',  bg: '#E6F4EA' };
};

interface Props {
  babyBirthDate?: string;
  avgTotalMin: number;
  avgNightMin: number;
  avgNapMin: number;
  period: SleepPeriod;
  daysWithData: number;
}

const SleepOmsBlock: React.FC<Props> = ({ babyBirthDate, avgTotalMin, avgNightMin, avgNapMin, period, daysWithData }) => {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);

  const rec           = getOmsRec(babyBirthDate);
  const hasEnoughData = daysWithData >= (MIN_DAYS_REQUIRED[period] ?? 3);
  const status        = getStatus(hasEnoughData ? avgTotalMin : 0, rec.totalMin, rec.totalMax);

  return (
    <View style={styles.container}>
      {/* Double card: OMS reco (left) + average (right) */}
      <TouchableOpacity style={[styles.omsDoubleCard, { overflow: 'hidden' }]} onPress={() => setShowInfo(true)} activeOpacity={0.9}>
        <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row' }]} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: '#E6F4EA' }} />
          <View style={{ flex: 1, backgroundColor: status.bg }} />
        </View>
        <View style={styles.omsLabelsRow}>
          <View style={styles.omsHalf}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.omsCardLabel, { color: '#2E7D32' }]}>{t('sleepAdvanced.omsTitle')}</Text>
              <MaterialCommunityIcons name="information-outline" size={13} color="#2E7D32" />
            </View>
          </View>
          <View style={styles.omsHalf}>
            <Text style={[styles.omsCardLabel, { color: status.color }]}>{t('sleepAdvanced.avgLabel')}</Text>
          </View>
        </View>
        <View style={styles.omsValuesRow}>
          <Text style={[styles.omsCardValue, { flex: 1, textAlign: 'center', color: '#1B5E20' }]}>
            {Math.floor(rec.totalMin / 60)}-{Math.floor(rec.totalMax / 60)}h/{t('sleepAdvanced.perDay')}
          </Text>
          <Text style={[styles.omsCardValue, { flex: 1, textAlign: 'center', color: status.color }]}>
            {hasEnoughData ? fmt(avgTotalMin) : '--'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Category cards */}
      {hasEnoughData && (
        <View style={styles.catRow}>
          <View style={[styles.catCard, { backgroundColor: '#EEF0FF' }]}>
            <Text style={styles.catIcon}>🌙</Text>
            <Text style={styles.catLabel}>{t('sleepAdvanced.nightLabel')}</Text>
            <Text style={styles.catValue}>{fmt(avgNightMin)}</Text>
            <Text style={styles.catSub}>/{t('sleepAdvanced.perDay')}</Text>
          </View>
          <View style={[styles.catCard, { backgroundColor: '#FFF8ED' }]}>
            <Text style={styles.catIcon}>😴</Text>
            <Text style={styles.catLabel}>{t('sleepAdvanced.napLabel')}</Text>
            <Text style={styles.catValue}>{fmt(avgNapMin)}</Text>
            <Text style={styles.catSub}>/{t('sleepAdvanced.perDay')}</Text>
          </View>
        </View>
      )}

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('sleepAdvanced.omsInfoTitle')}</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>{t('sleepAdvanced.omsInfoText')}</Text>

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text style={[styles.tableColAge, styles.tableHeaderTxt]}>{t('sleepAdvanced.tableAge')}</Text>
                  <Text style={[styles.tableColVal, styles.tableHeaderTxt]}>{t('sleepAdvanced.tableTotal')}</Text>
                  <Text style={[styles.tableColVal, styles.tableHeaderTxt]}>{t('sleepAdvanced.tableNight')}</Text>
                  <Text style={[styles.tableColVal, styles.tableHeaderTxt]}>{t('sleepAdvanced.tableNaps')}</Text>
                </View>
                {OMS_DATA.map((row, i) => {
                  const isCurrent = row === rec;
                  return (
                    <View key={i} style={[styles.tableRow, isCurrent && styles.tableRowCurrent]}>
                      <Text style={[styles.tableColAge, styles.tableCellTxt, isCurrent && styles.tableCellCurrentTxt]}>
                        {t(`sleepAdvanced.ageGroup${i + 1}`)}
                      </Text>
                      <Text style={[styles.tableColVal, styles.tableCellTxt, isCurrent && styles.tableCellCurrentTxt]}>
                        {Math.floor(row.totalMin / 60)}-{Math.floor(row.totalMax / 60)}h
                      </Text>
                      <Text style={[styles.tableColVal, styles.tableCellTxt, isCurrent && styles.tableCellCurrentTxt]}>
                        {Math.floor(row.nightMin / 60)}-{Math.floor(row.nightMax / 60)}h
                      </Text>
                      <Text style={[styles.tableColVal, styles.tableCellTxt, isCurrent && styles.tableCellCurrentTxt]}>
                        {row.napsMin}-{row.napsMax}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity onPress={() => Linking.openURL('https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more')}>
                <Text style={styles.modalLink}>{t('sleepAdvanced.omsInfoLink')} →</Text>
              </TouchableOpacity>
            </ScrollView>
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
  container:           { marginBottom: 16 },
  omsDoubleCard:       { borderRadius: 12, marginBottom: 10 },
  omsLabelsRow:        { flexDirection: 'row', paddingTop: 12, paddingHorizontal: 8, paddingBottom: 2 },
  omsValuesRow:        { flexDirection: 'row', paddingBottom: 14 },
  omsHalf:             { flex: 1, alignItems: 'center' },
  omsCardLabel:        { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  omsCardValue:        { fontSize: 20, fontWeight: '800' },
  // Category cards
  catRow:              { flexDirection: 'row', gap: 10 },
  catCard:             { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  catIcon:             { fontSize: 20, marginBottom: 4 },
  catLabel:            { fontSize: 11, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  catValue:            { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 4 },
  catSub:              { fontSize: 11, color: '#888', marginTop: 1 },
  // Modal
  overlay:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modal:               { backgroundColor: '#FDF1E7', borderRadius: 16, padding: 20, width: '86%', maxWidth: 360 },
  modalTitle:          { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  modalText:           { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  modalLink:           { fontSize: 14, color: '#C75B4A', fontWeight: '600', marginBottom: 16 },
  modalCloseBtn:       { backgroundColor: '#C75B4A', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
  modalCloseTxt:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  table:               { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E8D5C4', marginBottom: 14 },
  tableRow:            { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F0E0D0' },
  tableHeaderRow:      { backgroundColor: '#F0E0D0' },
  tableRowCurrent:     { backgroundColor: '#ECEAFC' },
  tableColAge:         { flex: 1.8 },
  tableColVal:         { flex: 1.2, textAlign: 'center' },
  tableHeaderTxt:      { fontSize: 11, fontWeight: '700', color: '#555' },
  tableCellTxt:        { fontSize: 11, color: '#555' },
  tableCellCurrentTxt: { fontWeight: '700', color: '#4F469F' },
});

export default SleepOmsBlock;
