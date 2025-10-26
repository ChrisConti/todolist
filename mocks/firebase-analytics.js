/**
 * Mock Firebase Analytics for Expo Go
 * This mock is used when running in Expo Go (no native modules available)
 */

const mockAnalytics = () => ({
  logScreenView: async () => {},
  logEvent: async () => {},
  logLogin: async () => {},
  logSignUp: async () => {},
  setUserProperty: async () => {},
  setUserId: async () => {},
  setAnalyticsCollectionEnabled: async () => {},
});

export default mockAnalytics;
