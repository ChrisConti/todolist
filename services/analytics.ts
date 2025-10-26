/**
 * Firebase Analytics Service
 * Track user events and screen views
 * 
 * Note: In development builds, this uses real Firebase Analytics.
 * In Expo Go, Metro config redirects to a mock implementation.
 */

import analytics from '@react-native-firebase/analytics';

export const Analytics = {
  /**
   * Log a screen view
   * @param screenName - The name of the screen
   */
  logScreenView: async (screenName: string) => {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
      console.log(`📊 Analytics: Screen view logged - ${screenName}`);
    } catch (error) {
      console.error('Analytics error (logScreenView):', error);
    }
  },

  /**
   * Log a custom event
   * @param eventName - The name of the event
   * @param params - Optional parameters for the event
   */
  logEvent: async (eventName: string, params?: Record<string, any>) => {
    try {
      await analytics().logEvent(eventName, params);
      console.log(`📊 Analytics: Event logged - ${eventName}`, params);
    } catch (error) {
      console.error('Analytics error (logEvent):', error);
    }
  },

  /**
   * Log when a user creates a task
   */
  logTaskCreated: async (taskType?: string) => {
    await Analytics.logEvent('task_created', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  /**
   * Log when a user completes a task
   */
  logTaskCompleted: async (taskType?: string) => {
    await Analytics.logEvent('task_completed', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  /**
   * Log when a user deletes a task
   */
  logTaskDeleted: async (taskType?: string) => {
    await Analytics.logEvent('task_deleted', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  /**
   * Log when a user joins a baby
   */
  logBabyJoined: async () => {
    await Analytics.logEvent('baby_joined', {
      timestamp: Date.now(),
    });
  },

  /**
   * Log when a user creates a baby
   */
  logBabyCreated: async () => {
    await Analytics.logEvent('baby_created', {
      timestamp: Date.now(),
    });
  },

  /**
   * Log user sign in
   */
  logSignIn: async (method: 'email' | 'google' | 'apple') => {
    try {
      await analytics().logLogin({ method });
      console.log(`📊 Analytics: User signed in - ${method}`);
    } catch (error) {
      console.error('Analytics error (logSignIn):', error);
    }
  },

  /**
   * Log user sign up
   */
  logSignUp: async (method: 'email' | 'google' | 'apple') => {
    try {
      await analytics().logSignUp({ method });
      console.log(`📊 Analytics: User signed up - ${method}`);
    } catch (error) {
      console.error('Analytics error (logSignUp):', error);
    }
  },

  /**
   * Set user properties
   */
  setUserProperty: async (name: string, value: string) => {
    try {
      await analytics().setUserProperty(name, value);
      console.log(`📊 Analytics: User property set - ${name}: ${value}`);
    } catch (error) {
      console.error('Analytics error (setUserProperty):', error);
    }
  },

  /**
   * Set user ID
   */
  setUserId: async (userId: string) => {
    try {
      await analytics().setUserId(userId);
      console.log(`📊 Analytics: User ID set - ${userId}`);
    } catch (error) {
      console.error('Analytics error (setUserId):', error);
    }
  },

  /**
   * Enable/disable analytics collection
   */
  setAnalyticsCollectionEnabled: async (enabled: boolean) => {
    try {
      await analytics().setAnalyticsCollectionEnabled(enabled);
      console.log(`📊 Analytics: Collection ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Analytics error (setAnalyticsCollectionEnabled):', error);
    }
  },
};

export default Analytics;
