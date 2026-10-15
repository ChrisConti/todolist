import React, { useMemo } from 'react';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThermoStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import { STATS_CONFIG } from '../constants/statsConfig';

interface ThermoProps {
  navigation: any;
  tasks: Task[];
}

const Thermo: React.FC<ThermoProps> = ({ navigation, tasks }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const { dailyStats, chartData, lastTask, isLoading, error } = useThermoStats(tasks, i18n.language);

  const renderChart = () => {
    const temperatureData = (chartData as any).temperatureData || [];

    if (temperatureData.length === 0) {
      return <Text style={styles.noDataText}>{t('thermo.noData')}</Text>;
    }

    return (
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>{t('thermo.tableTime')}</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>{t('thermo.tableTemp')}</Text>
        </View>

        {/* Rows */}
        {temperatureData.map((row: any, index: number) => {
          let backgroundColor = 'transparent';
          let textColor = theme.text;

          if (row.isMax) {
            backgroundColor = theme.dangerSoft;
            textColor = theme.category[1];
          } else if (row.isMin) {
            backgroundColor = theme.successSoft;
            textColor = theme.success;
          }

          return (
            <View
              key={index}
              style={[
                styles.tableRow,
                { backgroundColor },
                index % 2 === 0 && !row.isMax && !row.isMin ? styles.tableRowEven : null
              ]}
            >
              <Text style={[styles.tableCell, { flex: 1, color: textColor }]}>{row.time}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: row.isMin || row.isMax ? 'bold' : 'normal', color: textColor }]}>
                {row.temp.toFixed(1)}°
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <StatsContainer
      loading={isLoading}
      error={error}
      hasData={!!lastTask}
      emptyMessage={t('thermo.noTaskFound')}
    >
      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('thermo.someFigures')}</Text>

        {/* Today */}
        <View style={styles.statsBlock}>
          <Text style={styles.sectionSubtitle}>{t('thermo.today')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statsColumn}>
              <Text style={styles.statLabel}>Min:</Text>
              <Text style={styles.statLabel}>Max:</Text>
            </View>
            <View style={styles.statsColumn}>
              <Text style={styles.statValue}>{dailyStats.today.min !== null ? `${dailyStats.today.min.toFixed(1)}°` : 'N/A'}</Text>
              <Text style={styles.statValue}>{dailyStats.today.max !== null ? `${dailyStats.today.max.toFixed(1)}°` : 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Yesterday */}
        <View style={styles.statsBlock}>
          <Text style={styles.sectionSubtitle}>{t('thermo.yesterday')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statsColumn}>
              <Text style={styles.statLabel}>Min:</Text>
              <Text style={styles.statLabel}>Max:</Text>
            </View>
            <View style={styles.statsColumn}>
              <Text style={styles.statValue}>{dailyStats.yesterday.min !== null ? `${dailyStats.yesterday.min.toFixed(1)}°` : 'N/A'}</Text>
              <Text style={styles.statValue}>{dailyStats.yesterday.max !== null ? `${dailyStats.yesterday.max.toFixed(1)}°` : 'N/A'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('thermo.evolutionLast24Hours')}</Text>
        {renderChart()}
      </View>
    </StatsContainer>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  statsBlock: {
    marginBottom: STATS_CONFIG.SPACING.MEDIUM,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsColumn: {
    gap: STATS_CONFIG.SPACING.SMALL,
  },
  sectionSubtitle: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: theme.categoryAccent[0],
    marginBottom: 8,
  },
  statLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 4,
  },
  tableContainer: {
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: STATS_CONFIG.SPACING.MEDIUM,
    marginVertical: STATS_CONFIG.SPACING.MEDIUM,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.category[1],
    paddingBottom: STATS_CONFIG.SPACING.MEDIUM,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  tableHeaderText: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: 'bold',
    color: theme.textSecondary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: STATS_CONFIG.SPACING.SMALL,
    borderRadius: 8,
  },
  tableRowEven: {
    backgroundColor: 'transparent',
  },
  tableCell: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    marginTop: STATS_CONFIG.SPACING.LARGE,
  },
});

export default Thermo;
