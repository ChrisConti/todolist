import React, { ReactNode } from 'react';
import { Text, StyleSheet } from 'react-native';
import { STATS_CONFIG } from '../../constants/statsConfig';

interface SectionTitleProps {
  children: ReactNode;
}

/**
 * Reusable section title component
 * Replaces the duplicated titleParameter style across all stat components
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => {
  return <Text style={styles.title}>{children}</Text>;
};

const styles = StyleSheet.create({
  title: {
    color: STATS_CONFIG.COLORS.TEXT_TITLE,
    fontSize: STATS_CONFIG.FONT_SIZES.LARGE,
    fontWeight: 'bold',
    marginBottom: STATS_CONFIG.SPACING.SMALL,
    marginTop: STATS_CONFIG.SPACING.SMALL,
  },
});

export default SectionTitle;
