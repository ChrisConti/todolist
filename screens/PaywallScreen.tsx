import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BiberonIcon from '../assets/biberon-color.svg';
import DodoIcon from '../assets/dodo-color.svg';
import { useTranslation } from 'react-i18next';
import { usePremium } from '../Context/PremiumContext';
import Analytics from '../services/analytics';

// ─── Mini-preview : CSV export ───────────────────────────────────────────────

function ExportPreview() {
  const { t } = useTranslation();
  const rows = [
    ['07:30', '🍼', '120 ml'],
    ['10:15', '💤', '1h 45'],
    ['13:00', '🍼', '90 ml'],
  ];
  return (
    <View style={preview.table}>
      <View style={preview.headerRow}>
        {[t('premium.preview.colTime'), t('premium.preview.colType'), t('premium.preview.colQty')].map((h) => (
          <Text key={h} style={preview.th}>{h}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[preview.row, i % 2 === 1 && preview.rowAlt]}>
          {r.map((cell, j) => (
            <Text key={j} style={preview.td}>{cell}</Text>
          ))}
        </View>
      ))}
      <View style={preview.csvBadge}>
        <Text style={preview.csvText}>CSV</Text>
      </View>
    </View>
  );
}

// ─── Mini-preview : Stats avancées (bar chart 7j) ────────────────────────────

const BARS = [65, 90, 40, 110, 80, 95, 120];
const BAR_MAX = 120;

function StatsPreview() {
  return (
    <View style={preview.chartWrap}>
      <View style={preview.statsIconRow}>
        <View style={preview.statsIconBadge}><BiberonIcon width={12} height={12} /></View>
        <View style={preview.statsIconBadge}><DodoIcon width={12} height={12} /></View>
      </View>
      <View style={preview.chartBars}>
        {BARS.map((v, i) => (
          <View key={i} style={preview.barCol}>
            <View style={[preview.bar, { height: (v / BAR_MAX) * 48, backgroundColor: i === 6 ? '#C75B4A' : '#34777B' }]} />
          </View>
        ))}
      </View>
      <View style={preview.chartLabels}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <Text key={i} style={preview.dayLabel}>{d}</Text>
        ))}
      </View>
      <View style={preview.trendBadge}>
        <Ionicons name="trending-up" size={10} color="#4CAF50" />
        <Text style={preview.trendText}>+12%</Text>
      </View>
    </View>
  );
}

// ─── Mini-preview : Widget biberon ────────────────────────────────────────────

function WidgetPreview() {
  const { t } = useTranslation();
  return (
    <View style={preview.widget}>
      <View style={preview.widgetHeader}>
        <Text style={preview.widgetEmoji}>🍼</Text>
        <Text style={preview.widgetTitle}>{t('premium.preview.widgetName')}</Text>
      </View>
      <View style={preview.widgetAmount}>
        <Text style={preview.widgetMl}>120</Text>
        <Text style={preview.widgetUnit}>ml</Text>
      </View>
      <Text style={preview.widgetTime}>{t('premium.preview.widgetAgo')}</Text>
    </View>
  );
}

// ─── Mini-preview : Soutenir Tribu ────────────────────────────────────────────

function SoutenirPreview() {
  const { t } = useTranslation();
  return (
    <View style={preview.soutenir}>
      <Ionicons name="heart" size={28} color="#C75B4A" />
      <View style={preview.soutenirStats}>
        <View style={preview.soutenirRow}>
          <View style={preview.dot} />
          <Text style={preview.soutenirStat}>0 pub</Text>
        </View>
        <View style={preview.soutenirRow}>
          <View style={preview.dot} />
          <Text style={preview.soutenirStat}>0 tracking</Text>
        </View>
      </View>
      <Text style={preview.soutenirSub}>{t('premium.preview.team')}</Text>
    </View>
  );
}

// ─── Feature cards config ─────────────────────────────────────────────────────

const FEATURES = [
  { titleKey: 'premium.feature.export.title', subtitleKey: 'premium.feature.export.subtitle', Preview: ExportPreview },
  { titleKey: 'premium.feature.stats.title',  subtitleKey: 'premium.feature.stats.subtitle',  Preview: StatsPreview },
  { titleKey: 'premium.feature.widget.title', subtitleKey: 'premium.feature.widget.subtitle', Preview: WidgetPreview },
  { titleKey: 'premium.feature.support.title',subtitleKey: 'premium.feature.support.subtitle',Preview: SoutenirPreview },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { purchase, restore, isLoading, purchaseError, priceString } = usePremium();

  // Repli affiché uniquement si RevenueCat n'a pas pu charger l'offre. Doit rester
  // aligné sur le prix réel d'App Store Connect, sinon le paywall annonce un prix
  // que l'achat ne respectera pas.
  const displayPrice = priceString ?? '4,99 €';

  useEffect(() => {
    Analytics.logEvent('paywall_viewed');
  }, []);

  const handlePurchase = async () => {
    Analytics.logEvent('purchase_tapped', { price: displayPrice });
    const success = await purchase();
    if (success) navigation.goBack();
  };

  const handleClose = () => {
    Analytics.logEvent('paywall_closed');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={24} color="#666" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.premiumIcon}>
            <View style={styles.premiumIconShine} />
            <MaterialCommunityIcons name="star" size={36} color="#FFF" />
          </View>
          <Text style={styles.title}>{t('premium.title')}</Text>
          <Text style={styles.subtitle}>{t('premium.subtitle')}</Text>
        </View>

        {/* 2×2 feature grid */}
        <View style={styles.grid}>
          {FEATURES.map(({ titleKey, subtitleKey, Preview }, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{t(titleKey)}</Text>
              <Text style={styles.cardSubtitle}>{t(subtitleKey)}</Text>
              <View style={styles.previewWrap}>
                <Preview />
              </View>
            </View>
          ))}
        </View>

        {/* Price badge */}
        <View style={styles.priceBadge}>
          <View style={styles.priceBadgeLeft}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#C75B4A" />
            <Text style={styles.priceBadgeName}>{t('premium.badgeTitle')}</Text>
          </View>
          <Text style={styles.priceAmount}>{displayPrice}</Text>
        </View>

        {purchaseError ? (
          <Text style={styles.error}>{purchaseError}</Text>
        ) : null}

        {/* CTA */}
        <TouchableOpacity
          style={styles.cta}
          onPress={handlePurchase}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#E8960A" />
          ) : (
            <>
              <View style={styles.ctaIcon}>
                <View style={styles.ctaIconShine} />
                <MaterialCommunityIcons name="star" size={18} color="#FFF" />
              </View>
              <Text style={styles.ctaText}>{t('premium.cta', { price: displayPrice })}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#A8956A" />
            </>
          )}
        </TouchableOpacity>

        {/* Restore + mention */}
        <View style={styles.footer}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => { Analytics.logEvent('restore_tapped'); restore(); }} activeOpacity={0.7}>
              <Text style={styles.restoreLink}>{t('premium.restore')}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.footerNote}>{t('premium.oneTime')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Preview styles ───────────────────────────────────────────────────────────

const preview = StyleSheet.create({
  // CSV
  table: { width: '100%', marginTop: 4 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E0E0E0', paddingBottom: 2, marginBottom: 2 },
  th: { flex: 1, fontSize: 8, fontWeight: '700', color: '#999', textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 1 },
  rowAlt: { backgroundColor: '#F5F5F5', borderRadius: 2 },
  td: { flex: 1, fontSize: 8, color: '#444', textAlign: 'center' },
  csvBadge: { alignSelf: 'flex-end', backgroundColor: '#34777B', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginTop: 4 },
  csvText: { fontSize: 7, color: '#FFF', fontWeight: '700' },

  // Bar chart
  chartWrap: { width: '100%', marginTop: 4 },
  statsIconRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  statsIconBadge: {
    width: 20, height: 20, borderRadius: 5,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 2, minHeight: 4 },
  chartLabels: { flexDirection: 'row', marginTop: 2, gap: 3 },
  dayLabel: { flex: 1, fontSize: 7, color: '#999', textAlign: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 2, marginTop: 2 },
  trendText: { fontSize: 8, color: '#4CAF50', fontWeight: '700' },

  // Widget
  widget: {
    width: '100%', backgroundColor: '#34777B', borderRadius: 10,
    padding: 10, marginTop: 4,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  widgetEmoji: { fontSize: 12 },
  widgetTitle: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  widgetAmount: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 4 },
  widgetMl: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  widgetUnit: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 2, fontWeight: '600' },
  widgetTime: { fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Soutenir
  soutenir: { width: '100%', alignItems: 'center', gap: 6, marginTop: 4 },
  soutenirStats: { gap: 3 },
  soutenirRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4CAF50' },
  soutenirStat: { fontSize: 10, fontWeight: '700', color: '#333' },
  soutenirSub: { fontSize: 8, color: '#999' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDF1E7' },
  closeBtn: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    padding: 6, backgroundColor: '#FFF', borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  scroll: {
    paddingTop: 70, paddingBottom: 40, paddingHorizontal: 20,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  premiumIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#E8960A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#C47A00', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  premiumIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 36,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 20,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  card: {
    width: '47.5%', backgroundColor: '#FFF', borderRadius: 14,
    padding: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  cardSubtitle: { fontSize: 10, color: '#888', marginBottom: 6 },
  previewWrap: { marginTop: 2 },

  priceBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  priceBadgeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceBadgeName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  priceAmount: { fontSize: 16, fontWeight: '900', color: '#C75B4A' },

  error: { fontSize: 13, color: '#E53935', textAlign: 'center', marginBottom: 10 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D4AA50',
    paddingVertical: 16,
    marginBottom: 14,
  },
  ctaIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: '#E8960A',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaIconShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 16,
    backgroundColor: 'rgba(255,220,80,0.35)', borderRadius: 9,
  },
  ctaText: { color: '#3B1F00', fontSize: 16, fontWeight: '800' },

  footer: { alignItems: 'center', gap: 6 },
  restoreLink: { fontSize: 13, color: '#999', textDecorationLine: 'underline' },
  footerNote: { fontSize: 11, color: '#BBB' },
});
