/**
 * Statistics Configuration Constants
 * Centralized configuration for all stats-related magic numbers and settings
 */

export const STATS_CONFIG = {
  // Data filtering
  DEFAULT_DAYS_LIMIT: 7, // Number of days to load for stats
  CHART_DAYS: 7, // Number of days to show in charts

  // Chart dimensions
  BAR_MAX_WIDTH: 200, // Maximum width for horizontal bars
  BAR_MAX_HEIGHT: 120, // Maximum height for vertical bars
  BAR_MIN_HEIGHT: 30, // Minimum bar height
  CHART_PADDING: 10, // Padding around charts

  // Visual
  ANIMATION_DURATION: 300, // milliseconds
  BAR_OPACITY_NON_MAX: 0.5, // Opacity for non-maximum bars
  BAR_OPACITY_MAX: 1, // Opacity for maximum bars

  // Colors
  COLORS: {
    // Task type colors
    BIBERON: '#34777B',
    DIAPER: '#C75B4A',
    SLEEP: '#E29656',
    HEALTH: '#6B8DEA',
    TEMPERATURE: '#4F469F',
    BREASTFEEDING: '#1AAAAA',
    BREASTFEEDING_LEFT: '#1AAAAA',
    BREASTFEEDING_RIGHT: '#E29656',

    // UI colors
    BACKGROUND: '#FDF1E7',
    TEXT_PRIMARY: '#000',
    TEXT_SECONDARY: '#7A8889',
    TEXT_TITLE: '#7A8889',
    ERROR: '#C75B4A',
    WHITE: '#FFF',

    // Temperature indicators
    TEMP_MAX_BG: '#FFE5E5',
    TEMP_MAX_TEXT: '#C75B4A',
    TEMP_MIN_BG: '#E5F5E5',
    TEMP_MIN_TEXT: '#4CAF50',

    // Diaper types
    DIAPER_NORMAL: '#A8A8A8',
    DIAPER_SOFT: '#C75B4A',
    DIAPER_LIQUID: '#E29656',

    // Diaper content
    DIAPER_PEE: '#34777B',
    DIAPER_POOP: '#C75B4A',
    DIAPER_BOTH: '#E29656',
  },

  // Spacing
  SPACING: {
    SMALL: 5,
    MEDIUM: 10,
    LARGE: 20,
    XLARGE: 30,
  },

  // Typography
  FONT_SIZES: {
    SMALL: 12,
    MEDIUM: 14,
    LARGE: 16,
    TITLE: 18,
  },
};

// Diaper type mappings
export const DIAPER_TYPES = {
  NORMAL: 0,
  SOFT: 1,
  LIQUID: 2,
} as const;

export const DIAPER_CONTENT = {
  PEE: 0,
  POOP: 1,
  BOTH: 2,
} as const;

// Task type IDs
export const TASK_TYPES = {
  BIBERON: 0,
  DIAPER: 1,
  HEALTH: 2,
  SLEEP: 3,
  TEMPERATURE: 4,
  BREASTFEEDING: 5,
} as const;
