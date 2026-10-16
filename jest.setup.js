import '@testing-library/jest-native/extend-expect';

// Mock React Refresh
global.$RefreshReg$ = () => {};
global.$RefreshSig$ = () => () => {};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase
jest.mock('./config', () => ({
  auth: {},
  db: {},
  babiesRef: {},
  userRef: {},
}));

// Mock Expo modules
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
}));

// Module natif : absent de l'environnement de test. Sans ce mock, tout test
// qui monte le ThemeProvider échouerait au chargement.
jest.mock('expo-navigation-bar', () => ({
  setButtonStyleAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  locale: 'fr-FR',
  region: 'FR',
}));

// Mock Expo Vector Icons
// Les quatre familles réellement utilisées dans l'app. MaterialCommunityIcons
// manquait, d'où un « Element type is invalid » dès qu'un test montait un
// composant qui l'emploie.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

// Mock react-native-modal-datetime-picker
jest.mock('react-native-modal-datetime-picker', () => 'DateTimePicker');

// Mock react-native-uuid
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock SVG
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'fr',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock analytics
jest.mock('./services/analytics', () => ({
  __esModule: true,
  default: {
    logEvent: jest.fn(),
    logScreenView: jest.fn(),
    setUserId: jest.fn(),
    setUserProperty: jest.fn(),
  },
}));
