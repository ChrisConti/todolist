import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { STATS_CONFIG } from '../../../constants/statsConfig';

interface BarChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  color: string;
  showValues?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Reusable horizontal bar chart component
 * Used for displaying trends over days with labels
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  color,
  showValues = true,
  orientation = 'horizontal',
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Calculate chart width based on screen size
  const chartWidth = screenWidth - (STATS_CONFIG.SPACING.LARGE * 4);
  const maxBarWidth = orientation === 'horizontal' ? chartWidth * 0.7 : STATS_CONFIG.BAR_MAX_WIDTH;

  const renderBar = (item: BarChartData, index: number) => {
    const barWidth = (item.value / maxValue) * maxBarWidth;
    const isMax = item.value === maxValue;
    const opacity = isMax ? STATS_CONFIG.BAR_OPACITY_MAX : STATS_CONFIG.BAR_OPACITY_NON_MAX;

    return (
      <View key={index} style={styles.chartRow}>
        <Text style={styles.chartLabel}>{item.label}</Text>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              {
                width: barWidth,
                backgroundColor: color,
                opacity,
              },
            ]}
          >
            {showValues && item.value > 0 && (
              <Text style={styles.barText}>{item.value}</Text>
            )}
          </View>
          {item.value > 0 && (
            <View style={[styles.arrow, { borderLeftColor: color, opacity }]} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => renderBar(item, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    minHeight: 220,
    marginVertical: STATS_CONFIG.SPACING.MEDIUM,
    borderRadius: 16,
    backgroundColor: STATS_CONFIG.COLORS.BACKGROUND,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: STATS_CONFIG.SPACING.SMALL,
    width: '100%',
  },
  chartLabel: {
    width: 50,
    marginRight: STATS_CONFIG.SPACING.MEDIUM,
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    height: STATS_CONFIG.BAR_MIN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  arrow: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderTopColor: 'transparent',
    borderBottomWidth: 15,
    borderBottomColor: 'transparent',
    borderLeftWidth: 15,
  },
  barText: {
    color: STATS_CONFIG.COLORS.WHITE,
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: 'bold',
    paddingHorizontal: STATS_CONFIG.SPACING.SMALL,
  },
});

export default BarChart;
