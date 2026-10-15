import React, { useMemo, ReactNode } from 'react';
import { Text, StyleSheet } from 'react-native';
import { STATS_CONFIG } from '../../constants/statsConfig';
import { useTheme } from '../../Context/ThemeContext';
import type { Theme } from '../../constants/theme';

interface SectionTitleProps {
  children: ReactNode;
}

/**
 * Reusable section title component
 * Replaces the duplicated titleParameter style across all stat components
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <Text style={styles.title}>{children}</Text>;
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  title: {
    color: theme.textSecondary,
    fontSize: STATS_CONFIG.FONT_SIZES.LARGE,
    fontWeight: 'bold',
    marginBottom: STATS_CONFIG.SPACING.SMALL,
    marginTop: STATS_CONFIG.SPACING.SMALL,
  },
});

export default SectionTitle;
