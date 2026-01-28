import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { STATS_CONFIG } from '../../constants/statsConfig';

interface StatsContainerProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  hasData?: boolean;
  emptyMessage?: string;
}

/**
 * Container component for statistics screens
 * Handles loading, error, and empty states consistently
 */
const StatsContainer: React.FC<StatsContainerProps> = ({
  children,
  loading = false,
  error = null,
  hasData = true,
  emptyMessage,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={STATS_CONFIG.COLORS.DIAPER} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          {emptyMessage || t('stats.noData')}
        </Text>
      </View>
    );
  }

  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: STATS_CONFIG.SPACING.LARGE,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: STATS_CONFIG.SPACING.LARGE,
  },
  loadingText: {
    marginTop: STATS_CONFIG.SPACING.MEDIUM,
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.ERROR,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: STATS_CONFIG.FONT_SIZES.MEDIUM,
    color: STATS_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default StatsContainer;
