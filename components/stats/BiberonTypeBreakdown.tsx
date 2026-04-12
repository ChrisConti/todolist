import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Task } from '../../types/stats';
import { STATS_CONFIG } from '../../constants/statsConfig';

interface Props {
  tasks: Task[];
}

interface TypeStats {
  count: number;
  ml: number;
}

interface PeriodStats {
  days: number;
  total: TypeStats;
  artificial: TypeStats;
  maternal: TypeStats;
  unknown: TypeStats;
}

function computePeriod(tasks: Task[], days: number): PeriodStats {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const filtered = tasks.filter(t => new Date(t.date) >= since);

  const s: PeriodStats = {
    days,
    total: { count: 0, ml: 0 },
    artificial: { count: 0, ml: 0 },
    maternal: { count: 0, ml: 0 },
    unknown: { count: 0, ml: 0 },
  };

  filtered.forEach(task => {
    const ml = parseFloat(String(task.label)) || 0;
    s.total.count++;
    s.total.ml += ml;
    if (task.milkType === 'artificial') {
      s.artificial.count++;
      s.artificial.ml += ml;
    } else if (task.milkType === 'maternal') {
      s.maternal.count++;
      s.maternal.ml += ml;
    } else {
      s.unknown.count++;
      s.unknown.ml += ml;
    }
  });

  return s;
}

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const avg = (value: number, days: number) =>
  days > 0 ? (value / days).toFixed(1) : '0';

interface TypeRowProps {
  icon: string;
  label: string;
  stats: TypeStats;
  total: number;
  days: number;
  color: string;
}

const TypeRow: React.FC<TypeRowProps> = ({ icon, label, stats, total, days, color }) => {
  if (stats.count === 0) return null;
  return (
    <View style={styles.typeRow}>
      <View style={[styles.typeDot, { backgroundColor: color }]} />
      <View style={styles.typeInfo}>
        <Text style={styles.typeLabel}>{icon} {label}</Text>
        <Text style={styles.typeCount}>
          {stats.count} bib. <Text style={styles.typePct}>({pct(stats.count, total)}%)</Text>
        </Text>
      </View>
      <View style={styles.typeRight}>
        <Text style={styles.typeStat}>{avg(stats.count, days)}/j</Text>
        <Text style={styles.typeStatSub}>{avg(stats.ml, days)} ml/j</Text>
      </View>
    </View>
  );
};

const PeriodCard: React.FC<{ period: PeriodStats }> = ({ period }) => {
  const { t } = useTranslation();
  const { total, artificial, maternal, unknown, days } = period;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{days} jours</Text>
        <Text style={styles.cardTotal}>
          {total.count} bib. · {avg(total.count, days)}/j · {avg(total.ml, days)} ml/j
        </Text>
      </View>

      {total.count === 0 ? (
        <Text style={styles.empty}>{t('biberon.noTaskFound')}</Text>
      ) : (
        <View style={styles.typesList}>
          <TypeRow
            icon="🥛"
            label={t('milkType.artificial')}
            stats={artificial}
            total={total.count}
            days={days}
            color="#5ac8fa"
          />
          <TypeRow
            icon="🤱"
            label={t('milkType.maternal')}
            stats={maternal}
            total={total.count}
            days={days}
            color="#34c759"
          />
          <TypeRow
            icon="—"
            label={t('biberon.typeUnknown')}
            stats={unknown}
            total={total.count}
            days={days}
            color="#c7c7cc"
          />
        </View>
      )}
    </View>
  );
};

const BiberonTypeBreakdown: React.FC<Props> = ({ tasks }) => {
  const biberonTasks = tasks.filter(t => t.id === 0);

  const periods = [7, 30, 90].map(days => computePeriod(biberonTasks, days));

  return (
    <View style={styles.container}>
      {periods.map(period => (
        <PeriodCard key={period.days} period={period} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: STATS_CONFIG.SPACING.MEDIUM,
  },
  card: {
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: STATS_CONFIG.COLORS.BIBERON,
    marginBottom: 2,
  },
  cardTotal: {
    fontSize: 13,
    color: '#7A8889',
  },
  typesList: {
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  typeCount: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 1,
  },
  typePct: {
    color: '#7A8889',
    fontWeight: '400',
  },
  typeRight: {
    alignItems: 'flex-end',
  },
  typeStat: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  typeStatSub: {
    fontSize: 11,
    color: '#7A8889',
    marginTop: 1,
  },
  empty: {
    fontSize: 13,
    color: '#7A8889',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default BiberonTypeBreakdown;
