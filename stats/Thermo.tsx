import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import { useTranslation } from 'react-i18next';
import { useThermoStats } from '../hooks/useTaskStatistics';
import { Task } from '../types/stats';
import StatsContainer from '../components/stats/StatsContainer';
import SectionTitle from '../components/stats/SectionTitle';
import { STATS_CONFIG } from '../constants/statsConfig';

interface ThermoProps {
  navigation: any;
  tasks: Task[];
}

const Thermo: React.FC<ThermoProps> = ({ navigation, tasks }) => {
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
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Heure</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Température</Text>
        </View>

        {/* Rows */}
        {temperatureData.map((row: any, index: number) => {
          let backgroundColor = 'transparent';
          let textColor = STATS_CONFIG.COLORS.TEXT_PRIMARY;

          if (row.isMax) {
            backgroundColor = '#FFE5E5';
            textColor = STATS_CONFIG.COLORS.DIAPER;
          } else if (row.isMin) {
            backgroundColor = '#E5F5E5';
            textColor = '#4CAF50';
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
      {/* Last Task */}
      {lastTask && (
        <View style={styles.section}>
          <SectionTitle>{t('thermo.lastTask')}</SectionTitle>
          <Card key={lastTask.uid} task={lastTask} navigation={navigation} editable={false} />
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <SectionTitle>{t('thermo.someFigures')}</SectionTitle>

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
        <SectionTitle>{t('thermo.evolutionLast24Hours')}</SectionTitle>
        {renderChart()}
      </View>
    </StatsContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: STATS_CONFIG.SPACING.LARGE,
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
    color: STATS_CONFIG.COLORS.BIBERON,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  statValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: '500',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  tableContainer: {
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    borderRadius: 16,
    padding: STATS_CONFIG.SPACING.MEDIUM,
    marginVertical: STATS_CONFIG.SPACING.MEDIUM,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: STATS_CONFIG.COLORS.DIAPER,
    paddingBottom: STATS_CONFIG.SPACING.MEDIUM,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  tableHeaderText: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    fontWeight: 'bold',
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
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
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    marginTop: STATS_CONFIG.SPACING.LARGE,
  },
});

export default Thermo;
