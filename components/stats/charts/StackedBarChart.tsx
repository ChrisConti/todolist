import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATS_CONFIG } from '../../../constants/statsConfig';

interface StackedBarChartProps {
  labels: string[];
  data: (number | string)[][];
  barColors: string[];
  legend?: string[];
}

/**
 * Reusable stacked vertical bar chart component
 * Used for diaper statistics with multiple categories
 */
const StackedBarChart: React.FC<StackedBarChartProps> = ({
  labels,
  data,
  barColors,
  legend,
}) => {
  const flatData = data.flat().filter((v) => typeof v === 'number') as number[];
  const maxValue = flatData.length > 0 ? Math.max(...flatData) : 1;

  const renderBar = (value: number | string, color: string) => {
    if (!value || typeof value === 'string') return null;

    const barHeight = (value / maxValue) * STATS_CONFIG.BAR_MAX_HEIGHT;

    return (
      <View style={[styles.bar, { height: barHeight, backgroundColor: color }]}>
        <Text style={styles.barText}>{value}</Text>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.chartContainer}>
        {labels.map((label, index) => {
          const dayData = data[index];
          const dayTotal = dayData.reduce<number>(
            (acc, val) => acc + (typeof val === 'number' ? val : 0),
            0
          );

          return (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.totalLabel}>{dayTotal || ''}</Text>
              {dayData.map((value, idx) => (
                <View key={idx}>{renderBar(value as number, barColors[idx])}</View>
              ))}
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      {legend && (
        <View style={styles.legendContainer}>
          {legend.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: barColors[index] },
                ]}
              />
              <Text style={styles.legendText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderRadius: 16,
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
    paddingVertical: STATS_CONFIG.SPACING.MEDIUM,
    minHeight: 180,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartLabel: {
    marginTop: STATS_CONFIG.SPACING.SMALL,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  bar: {
    width: 30,
    marginHorizontal: STATS_CONFIG.SPACING.SMALL,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  barText: {
    color: STATS_CONFIG.COLORS.WHITE,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
  },
  totalLabel: {
    marginBottom: STATS_CONFIG.SPACING.SMALL,
    fontWeight: 'bold',
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: STATS_CONFIG.SPACING.SMALL,
    marginVertical: STATS_CONFIG.SPACING.SMALL,
  },
  legendColor: {
    width: 10,
    height: 10,
    marginRight: STATS_CONFIG.SPACING.SMALL,
    borderRadius: 2,
  },
  legendText: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
});

export default StackedBarChart;
