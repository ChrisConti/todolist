import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { onSnapshot, query, where } from 'firebase/firestore';
import moment from 'moment';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import Analytics from '../services/analytics';
import { usePremium } from '../Context/PremiumContext';
import { SingleDayTimeline, CompareDayTimeline } from '../components/BiberonTimeline';
import { TendanceChart } from '../components/TendanceChart';
import { RythmeChart } from '../components/RythmeChart';
import BiberonTypeBreakdown from '../components/stats/BiberonTypeBreakdown';

type TopTab    = 'global' | 'advanced';
type MainTab   = 'detail' | 'tendance' | 'rythme' | 'type';
type DayTab    = 'today' | 'yesterday' | 'compare';
type GlobalMode = 'count' | 'quantity';

interface MilkBreakdown { count: number; ml: number; }
interface DayStats {
  total: { count: number; ml: number };
  maternal: MilkBreakdown;
  artificial: MilkBreakdown;
  unknown: MilkBreakdown;
}

const EMPTY_DAY: DayStats = {
  total: { count: 0, ml: 0 },
  maternal: { count: 0, ml: 0 },
  artificial: { count: 0, ml: 0 },
  unknown: { count: 0, ml: 0 },
};

const BIBERON_COLOR = '#34777B';
const BG = '#FDF1E7';
const WHITE = '#FFF';

export default function BiberonInsights({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, babyID } = useContext(AuthentificationUserContext) as any;
  const { isPremium } = usePremium();
  const [tasks, setTasks]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [topTab, setTopTab]         = useState<TopTab>('global');
  const [globalMode, setGlobalMode] = useState<GlobalMode>('count');
  const [mainTab, setMainTab]       = useState<MainTab>('detail');
  const [dayTab, setDayTab]         = useState<DayTab>('today');
  const enterTimeRef = useRef(Date.now());
  const mainTabEnterTimeRef = useRef(Date.now());
  const dayTabEnterTimeRef = useRef(Date.now());

  useEffect(() => {
    Analytics.logScreenView('BiberonInsights');
    enterTimeRef.current = Date.now();
    mainTabEnterTimeRef.current = Date.now();
    dayTabEnterTimeRef.current = Date.now();
    return () => {
      Analytics.logEvent('stats_time_spent', {
        screen: 'BiberonInsights',
        duration_sec: Math.round((Date.now() - enterTimeRef.current) / 1000),
      });
    };
  }, []);

  useEffect(() => {
    if (!user || !babyID) { setLoading(false); return; }
    // Query by babyID directly so multi-baby users always get the right data
    const babyQuery = query(babiesRef, where('id', '==', babyID));
    const unsub = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData) {
          const since = moment().subtract(90, 'days').startOf('day').toDate();
          const bottles = (babyData.tasks || []).filter((task: any) =>
            task.id === 0 && new Date(task.date) >= since
          );
          setTasks(bottles);
        }
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [babyID, user]);

  // ── Stats helpers ──────────────────────────────────────────────────────────

  const computeStats = (dayMoment: moment.Moment): DayStats => {
    const dayTasks = tasks.filter(t =>
      moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSame(dayMoment, 'day')
    );
    const s: DayStats = JSON.parse(JSON.stringify(EMPTY_DAY));
    dayTasks.forEach((task) => {
      const ml = parseFloat(task.label) || 0;
      s.total.count += 1;
      s.total.ml += ml;
      if (task.milkType === 'maternal')       { s.maternal.count++;   s.maternal.ml += ml; }
      else if (task.milkType === 'artificial') { s.artificial.count++; s.artificial.ml += ml; }
      else                                     { s.unknown.count++;    s.unknown.ml += ml; }
    });
    return s;
  };

  const todayStats     = useMemo(() => computeStats(moment()), [tasks]);
  const yesterdayStats = useMemo(() => computeStats(moment().subtract(1, 'day')), [tasks]);

  const last7DaysStats = useMemo((): DayStats => {
    const since = moment().subtract(6, 'days').startOf('day');
    const s: DayStats = JSON.parse(JSON.stringify(EMPTY_DAY));
    tasks.filter(t => moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSameOrAfter(since)).forEach((task) => {
      const ml = parseFloat(task.label) || 0;
      s.total.count += 1;
      s.total.ml += ml;
    });
    return s;
  }, [tasks]);


  const todayTasks = useMemo(() =>
    tasks
      .filter(t => moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment(), 'day'))
      .sort((a, b) => moment(a.date, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.date, 'YYYY-MM-DD HH:mm:ss'))),
    [tasks]
  );

  const yesterdayTasks = useMemo(() =>
    tasks
      .filter(t => moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(1, 'day'), 'day'))
      .sort((a, b) => moment(a.date, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.date, 'YYYY-MM-DD HH:mm:ss'))),
    [tasks]
  );

  const diff = (a: number, b: number) => {
    const d = a - b;
    if (d === 0) return { label: '=', color: '#999' };
    return { label: (d > 0 ? '+' : '') + d, color: d > 0 ? '#4CAF50' : '#E53935' };
  };
  const diffMl = (a: number, b: number) => {
    const d = a - b;
    if (d === 0) return { label: '=', color: '#999' };
    return { label: (d > 0 ? '+' : '') + d + ' ' + t('ml'), color: d > 0 ? '#4CAF50' : '#E53935' };
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderSummaryRow = (label: string, emoji: string, data: MilkBreakdown) => {
    if (data.count === 0) return null;
    return (
      <View style={styles.tableRow} key={label}>
        <Text style={styles.tableCell}>{emoji} {label}</Text>
        <Text style={[styles.tableCell, styles.tableCellCenter]}>{data.count}</Text>
        <Text style={[styles.tableCell, styles.tableCellRight]}>{data.ml} {t('ml')}</Text>
      </View>
    );
  };

  const renderDayView = (stats: DayStats, label: string, dayTasks: any[]) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{label}</Text>
      <View style={styles.totalsRow}>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeValue}>{stats.total.count}</Text>
          <Text style={styles.totalBadgeLabel}>{t('tendance.bottles')}</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeValue}>{stats.total.ml}</Text>
          <Text style={styles.totalBadgeLabel}>{t('ml')}</Text>
        </View>
      </View>
      {stats.total.count === 0 ? (
        <Text style={styles.emptyText}>{t('biberon.noBottleRecorded')}</Text>
      ) : (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>{t('biberon.typeHeader')}</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter, styles.tableHeaderText]}>{t('tendance.bottles')}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.tableHeaderText]}>{t('biberon.volumeHeader')}</Text>
          </View>
          {renderSummaryRow(t('milkType.maternal'), '🤱', stats.maternal)}
          {renderSummaryRow(t('milkType.artificial'), '🥛', stats.artificial)}
          {renderSummaryRow(t('milkType.title'), '🍼', stats.unknown)}
        </View>
      )}
      {dayTasks.length > 0 && (
        <View style={styles.timelineSection}>
          <Text style={styles.timelineSectionTitle}>Timeline</Text>
          <SingleDayTimeline tasks={dayTasks} />
        </View>
      )}
    </View>
  );

  const renderCompareRow = (label: string, emoji: string, todayVal: number, yestVal: number, isCount: boolean) => {
    const d = isCount ? diff(todayVal, yestVal) : diffMl(todayVal, yestVal);
    return (
      <View style={styles.compareRow} key={label}>
        <Text style={styles.compareLabel}>{emoji} {label}</Text>
        <Text style={styles.compareCell}>{isCount ? String(todayVal) : `${todayVal} ${t('ml')}`}</Text>
        <Text style={styles.compareCell}>{isCount ? String(yestVal) : `${yestVal} ${t('ml')}`}</Text>
        <Text style={[styles.compareCell, { color: d.color, fontWeight: '700' }]}>{d.label}</Text>
      </View>
    );
  };

  const renderCompareView = () => (
    <View style={styles.card}>
      <View style={[styles.compareRow, styles.compareHeaderRow]}>
        <Text style={[styles.compareLabel, styles.compareHeaderText]}> </Text>
        <Text style={[styles.compareCell, styles.compareHeaderText]}>{t('biberon.today')}</Text>
        <Text style={[styles.compareCell, styles.compareHeaderText]}>{t('biberon.yesterday')}</Text>
        <Text style={[styles.compareCell, styles.compareHeaderText]}>{t('biberon.compareGap')}</Text>
      </View>
      <Text style={styles.compareSection}>{t('biberon.compareTotal')}</Text>
      {renderCompareRow(t('tendance.bottles'), '🍼', todayStats.total.count, yesterdayStats.total.count, true)}
      {renderCompareRow(t('biberon.volumeHeader'), '💧', todayStats.total.ml, yesterdayStats.total.ml, false)}
      {([
        { label: t('milkType.maternal'), emoji: '🤱', key: 'maternal' as const },
        { label: t('milkType.artificial'), emoji: '🥛', key: 'artificial' as const },
        { label: t('milkType.title'), emoji: '🍼', key: 'unknown' as const },
      ]).map(({ label, emoji, key }) => {
        const tDay = todayStats[key];
        const yDay = yesterdayStats[key];
        if (tDay.count === 0 && yDay.count === 0) return null;
        return (
          <View key={key}>
            <Text style={styles.compareSection}>{emoji} {label}</Text>
            {renderCompareRow(t('tendance.bottles'), '', tDay.count, yDay.count, true)}
            {renderCompareRow(t('biberon.volumeHeader'), '', tDay.ml, yDay.ml, false)}
          </View>
        );
      })}
      {(todayTasks.length > 0 || yesterdayTasks.length > 0) && (
        <View style={styles.timelineSection}>
          <Text style={styles.timelineSectionTitle}>Timeline</Text>
          <CompareDayTimeline todayTasks={todayTasks} yesterdayTasks={yesterdayTasks} />
        </View>
      )}
    </View>
  );

  // ── Global tab ─────────────────────────────────────────────────────────────

  const globalChartData = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const mlData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days');
      labels.push(day.format('dd').charAt(0).toUpperCase());
      const dayTasks = tasks.filter(t =>
        moment(t.date, 'YYYY-MM-DD HH:mm:ss').isSame(day, 'day')
      );
      data.push(dayTasks.length);
      const ml = dayTasks.reduce((sum, t) => sum + (parseFloat(t.label) || 0), 0);
      mlData.push(Math.round(ml));
    }
    return { labels, data, mlData };
  }, [tasks]);

  const renderGlobalTab = () => {
    const isCount = globalMode === 'count';
    const chartValues = isCount ? globalChartData.data : globalChartData.mlData;
    const maxVal = Math.max(...chartValues, 1);
    const BAR_MAX_H = 80;

    const statRows = [
      { label: t('biberon.today'),     count: todayStats.total.count,     ml: todayStats.total.ml },
      { label: t('biberon.yesterday'), count: yesterdayStats.total.count, ml: yesterdayStats.total.ml },
      { label: t('biberon.last7Days'), count: last7DaysStats.total.count, ml: last7DaysStats.total.ml },
    ];

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('biberon.someFigures')}</Text>

          {/* Sélecteur comptage / quantité */}
          <View style={styles.globalModeRow}>
            <TouchableOpacity
              style={[styles.globalModeBtn, isCount && styles.globalModeBtnActive]}
              onPress={() => setGlobalMode('count')}
            >
              <Text style={[styles.globalModeTxt, isCount && styles.globalModeTxtActive]}>
                {t('stats.count')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.globalModeBtn, !isCount && styles.globalModeBtnActive]}
              onPress={() => setGlobalMode('quantity')}
            >
              <Text style={[styles.globalModeTxt, !isCount && styles.globalModeTxtActive]}>
                {t('stats.quantity')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsColumn}>
              <Text style={styles.statLabel}>{t('biberon.today')}</Text>
              <Text style={styles.statLabel}>{t('biberon.yesterday')}</Text>
              <Text style={styles.statLabel}>{t('biberon.last7Days')}</Text>
            </View>
            <View style={styles.statsColumn}>
              {statRows.map((r, i) => (
                <Text key={i} style={styles.statValue}>
                  {isCount
                    ? (r.count > 0 ? String(r.count) : '–')
                    : (r.ml > 0 ? `${Math.round(r.ml)} ${t('ml')}` : '–')}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('biberon.evolutionLast7Days')}</Text>
          <View style={styles.globalChartWrap}>
            {globalChartData.labels.map((label, i) => {
              const val = chartValues[i];
              const barH = val === 0 ? 0 : (val / maxVal) * BAR_MAX_H;
              const isMax = val === maxVal && val > 0;
              return (
                <View key={i} style={styles.globalChartCol}>
                  {!isCount && val > 0 && (
                    <Text style={styles.globalBarAbove}>{val}</Text>
                  )}
                  {val > 0 && (
                    <View style={[styles.globalBar, { height: barH, opacity: isMax ? 1 : 0.55 }]}>
                      {isCount && <Text style={styles.globalBarVal}>{val}</Text>}
                    </View>
                  )}
                  <Text style={styles.globalChartLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Locked overlay ──────────────────────────────────────────────────────────

  const BIBERON_FEATS = [
    { icon: 'calendar-today',    key: 'premium.advancedBiberon.feat1' },
    { icon: 'trending-up',       key: 'premium.advancedBiberon.feat2' },
    { icon: 'clock-outline',     key: 'premium.advancedBiberon.feat3' },
    { icon: 'water-outline',     key: 'premium.advancedBiberon.feat4' },
  ] as const;

  const renderLockedAdvanced = () => (
    <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center', paddingTop: 32 }]}>
      <View style={styles.premiumIconLock}>
        <View style={styles.premiumIconLockShine} />
        <MaterialCommunityIcons name="star" size={32} color="#FFF" />
      </View>
      <Text style={styles.lockedTitle}>{t('premium.advancedBiberon.title')}</Text>
      <Text style={styles.lockedSub}>{t('premium.upsellTitle')}</Text>

      <View style={styles.featList}>
        {BIBERON_FEATS.map(({ icon, key }) => (
          <View key={key} style={styles.featRow}>
            <View style={styles.featIconWrap}>
              <MaterialCommunityIcons name={icon as any} size={16} color={BIBERON_COLOR} />
            </View>
            <Text style={styles.featText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.lockedCta}
        onPress={() => { Analytics.logEvent('paywall_opened', { source: 'biberon_advanced' }); navigation.navigate('Paywall'); }}
        activeOpacity={0.9}
      >
        <View style={styles.lockedCtaIcon}>
          <View style={styles.lockedCtaIconShine} />
          <MaterialCommunityIcons name="star" size={16} color="#FFF" />
        </View>
        <Text style={styles.lockedCtaText}>{t('premium.unlockCta')}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color="#A8956A" />
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  const MAIN_TABS: { key: MainTab; label: string }[] = [
    { key: 'detail',   label: t('biberon.viewDetail') },
    { key: 'tendance', label: t('biberon.tabTrend') },
    { key: 'rythme',   label: t('biberon.tabRhythm') },
    { key: 'type',     label: t('biberon.viewType') },
  ];

  const DAY_TABS: { key: DayTab; label: string }[] = [
    { key: 'today',     label: t('biberon.today') },
    { key: 'yesterday', label: t('biberon.yesterday') },
    { key: 'compare',   label: t('biberon.tabCompare') },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#F6F0EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('biberon.insightsTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Top-level Global / Avancé selector */}
      <View style={styles.topTabRow}>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'global' && styles.topTabBtnActive]}
          onPress={() => setTopTab('global')}
        >
          <Text style={[styles.topTabText, topTab === 'global' && styles.topTabTextActive]}>
            {t('sleepAdvanced.tabGlobal')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'advanced' && styles.topTabBtnActive]}
          onPress={() => setTopTab('advanced')}
        >
          <Text style={[styles.topTabText, topTab === 'advanced' && styles.topTabTextActive]}>
            {t('sleepAdvanced.tabAdvanced')}{!isPremium ? ' ★' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={BIBERON_COLOR} />
      ) : topTab === 'global' ? (
        renderGlobalTab()
      ) : !isPremium ? (
        renderLockedAdvanced()
      ) : (
        <>
          {/* Main tab selector (Avancé only) */}
          <View style={styles.mainTabRow}>
            {MAIN_TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  const dur = Math.round((Date.now() - mainTabEnterTimeRef.current) / 1000);
                  Analytics.logEvent('stats_tab_time_spent', { screen: 'BiberonInsights', tab: mainTab, duration_sec: dur });
                  mainTabEnterTimeRef.current = Date.now();
                  setMainTab(key);
                  Analytics.logEvent('tab_selected', { screen: 'BiberonInsights', tab: key });
                }}
                style={[styles.mainTabBtn, mainTab === key && styles.mainTabBtnActive]}
              >
                <Text style={[styles.mainTabText, mainTab === key && styles.mainTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sub-tabs (Détail only) */}
          {mainTab === 'detail' && (
            <View style={styles.dayTabRow}>
              {DAY_TABS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    const dur = Math.round((Date.now() - dayTabEnterTimeRef.current) / 1000);
                    Analytics.logEvent('stats_tab_time_spent', { screen: 'BiberonInsights', tab: `detail_${dayTab}`, duration_sec: dur });
                    dayTabEnterTimeRef.current = Date.now();
                    setDayTab(key);
                    Analytics.logEvent('tab_selected', { screen: 'BiberonInsights', tab: `detail_${key}` });
                  }}
                  style={[styles.dayTabBtn, dayTab === key && styles.dayTabBtnActive]}
                >
                  <Text style={[styles.dayTabText, dayTab === key && styles.dayTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView
            key={mainTab}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {mainTab === 'detail' && dayTab === 'today'     && renderDayView(todayStats, t('biberon.today'), todayTasks)}
            {mainTab === 'detail' && dayTab === 'yesterday' && renderDayView(yesterdayStats, t('biberon.yesterday'), yesterdayTasks)}
            {mainTab === 'detail' && dayTab === 'compare'   && renderCompareView()}
            {mainTab === 'tendance' && <TendanceChart tasks={tasks} />}
            {mainTab === 'rythme'   && <RythmeChart tasks={tasks} />}
            {mainTab === 'type'     && <BiberonTypeBreakdown tasks={tasks} />}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BIBERON_COLOR,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F6F0EB' },

  // Top-level Global / Avancé tabs
  topTabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 3,
    margin: 12,
    marginBottom: 6,
    gap: 3,
  },
  topTabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center',
  },
  topTabBtnActive: { backgroundColor: BIBERON_COLOR },
  topTabText: { fontSize: 14, fontWeight: '600', color: '#7A8889' },
  topTabTextActive: { color: '#FFF' },

  // Main tabs (Détail / Tendance / Rythme)
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: BIBERON_COLOR,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },
  mainTabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mainTabBtnActive: { backgroundColor: WHITE },
  mainTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  mainTabTextActive: { color: BIBERON_COLOR },

  // Day sub-tabs (Aujourd'hui / Hier / Comparatif)
  dayTabRow: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  dayTabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
  },
  dayTabBtnActive: { backgroundColor: BIBERON_COLOR },
  dayTabText: { fontSize: 12, fontWeight: '600', color: '#7A8889' },
  dayTabTextActive: { color: WHITE },

  content: { padding: 16, paddingBottom: 40 },

  // Cards
  card: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: BIBERON_COLOR, marginBottom: 16 },
  totalsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  totalBadge: {
    flex: 1, backgroundColor: BG, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  totalBadgeValue: { fontSize: 28, fontWeight: '800', color: BIBERON_COLOR },
  totalBadgeLabel: { fontSize: 13, color: '#7A8889', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 14, paddingVertical: 16 },

  // Table
  table: { gap: 0 },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8, marginBottom: 4 },
  tableHeaderText: { fontSize: 12, color: '#999', fontWeight: '600' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  tableCell: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  tableCellCenter: { textAlign: 'center' },
  tableCellRight: { textAlign: 'right' },

  // Compare
  compareHeaderRow: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8, marginBottom: 4 },
  compareHeaderText: { fontSize: 12, color: '#999', fontWeight: '600' },
  compareSection: { fontSize: 13, fontWeight: '700', color: BIBERON_COLOR, marginTop: 14, marginBottom: 4 },
  compareRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  compareLabel: { flex: 2, fontSize: 13, color: '#333', fontWeight: '500' },
  compareCell: { flex: 1, textAlign: 'center', fontSize: 13, color: '#333' },

  // Timeline
  timelineSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  timelineSectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  // Global tab mode selector + stats
  globalModeRow: {
    flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8,
    padding: 4, marginBottom: 16, gap: 4,
  },
  globalModeBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center',
  },
  globalModeBtnActive: { backgroundColor: BIBERON_COLOR },
  globalModeTxt: { fontSize: 13, fontWeight: '600', color: '#7A8889' },
  globalModeTxtActive: { color: '#FFF' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statsColumn: { gap: 8 },
  statLabel: { fontSize: 14, color: '#374151' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Locked view
  lockedTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 6, textAlign: 'center' },
  lockedSub:   { fontSize: 13, color: '#7A8889', marginBottom: 24, textAlign: 'center' },
  featList: { width: '100%', gap: 10, marginBottom: 28 },
  featRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: `${BIBERON_COLOR}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  featText: { fontSize: 14, color: '#374151', fontWeight: '500', flex: 1 },
  lockedCta: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#D4AA50',
    paddingVertical: 14, paddingHorizontal: 18, width: '100%',
  },
  lockedCtaIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#E8960A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  lockedCtaIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 15,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 8,
  },
  lockedCtaText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#3B1F00' },

  // Premium lock icon
  premiumIconLock: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#E8960A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, overflow: 'hidden',
  },
  premiumIconLockShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 32,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 18,
  },

  // Global tab chart
  globalChartWrap: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    height: 150, marginTop: 8,
  },
  globalChartCol: { alignItems: 'center', flex: 1 },
  globalBarAbove: { fontSize: 10, fontWeight: '600', color: '#7A8889', marginBottom: 3, textAlign: 'center' },
  globalBar: {
    width: 30, backgroundColor: BIBERON_COLOR, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  globalBarVal: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  globalChartLabel: { fontSize: 11, color: '#7A8889', marginTop: 4 },
});
