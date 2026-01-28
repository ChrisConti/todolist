// App Configuration Constants

// Time ranges
export const DAYS_TO_SHOW_TASKS = 7;
export const APP_INIT_TIMEOUT = 10000; // 10 seconds

// Firebase Collections
export const COLLECTIONS = {
  USERS: 'Users',
  BABY: 'Baby',
} as const;

// Task Types
export const TASK_TYPES = {
  BOTTLE: 0,
  DIAPER: 1,
  HEALTH: 2,
  SLEEP: 3,
  TEMPERATURE: 4,
  BREASTFEEDING: 5,
} as const;

export const TASK_LABELS = {
  [TASK_TYPES.BOTTLE]: 'biberon',
  [TASK_TYPES.DIAPER]: 'couche',
  [TASK_TYPES.HEALTH]: 'Sante',
  [TASK_TYPES.SLEEP]: 'sommeil',
  [TASK_TYPES.TEMPERATURE]: 'thermo',
  [TASK_TYPES.BREASTFEEDING]: 'allaitement',
} as const;

// Baby Types
export const BABY_TYPES = {
  BOY: 'Boy',
  GIRL: 'Girl',
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MIN_BIRTHDATE_LENGTH: 8,
  BIRTHDATE_FORMAT: 'DD/MM/YYYY',
  BIRTHDATE_REGEX: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  TIMER1_CREATE_TASK: 'timer1_createtask',
  TIMER2_CREATE_TASK: 'timer2_createtask',
} as const;

// Theme Colors
export const COLORS = {
  PRIMARY: '#C75B4A',
  BACKGROUND: '#FDF1E7',
  WHITE: '#fff',
  BLACK: '#000',
  TEXT_PRIMARY: '#333',
  TEXT_SECONDARY: '#666',
} as const;

// Keyboard Configuration
// Using 'padding' behavior works consistently across both platforms
// The offset accounts for the navigation header height
export const KEYBOARD_CONFIG = {
  BEHAVIOR: 'padding' as const,
  IOS_OFFSET: 90,
  ANDROID_OFFSET: 90, // Using same offset for consistency
} as const;
