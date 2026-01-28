import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATS_CONFIG } from '../../../constants/statsConfig';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValues?: Array<{ label: string; value: string | number }>;
}

/**
 * Reusable card component for displaying a single statistic
 * Used for displaying "Today", "Yesterday", "Last 7 days" stats
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, unit, subValues }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subValues && subValues.length > 0 && (
        <View style={styles.subValuesContainer}>
          {subValues.map((subValue, index) => (
            <View key={index} style={styles.subValueRow}>
              <Text style={styles.subLabel}>{subValue.label}:</Text>
              <Text style={styles.subValue}>{subValue.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: STATS_CONFIG.COLORS.WHITE,
    borderRadius: 8,
    padding: STATS_CONFIG.SPACING.MEDIUM,
    marginBottom: STATS_CONFIG.SPACING.MEDIUM,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: STATS_CONFIG.FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
  unit: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    marginLeft: STATS_CONFIG.SPACING.SMALL,
  },
  subValuesContainer: {
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
  },
  subValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: STATS_CONFIG.SPACING.SMALL,
  },
  subLabel: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
  },
  subValue: {
    fontSize: STATS_CONFIG.FONT_SIZES.SMALL,
    fontWeight: '600',
    color: STATS_CONFIG.COLORS.TEXT_PRIMARY,
  },
});

export default StatCard;
