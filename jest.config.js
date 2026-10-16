module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase|@react-native-firebase)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    // Les .svg passent par react-native-svg-transformer dans Metro, absent ici.
    // Sans ce mock ils arrivent comme un objet, et tout composant qui en rend
    // un échoue sur « Element type is invalid » — ce qui rendait la branche
    // vide de StatsContainer, et donc IllustrationGround, non testable.
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
