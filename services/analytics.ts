import analytics from '@react-native-firebase/analytics';
import * as amplitude from '@amplitude/analytics-react-native';
import appsFlyer from 'react-native-appsflyer';
import { Platform } from 'react-native';

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ?? '';
const AF_DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? '';
const AF_APP_ID = process.env.EXPO_PUBLIC_APPSFLYER_APP_ID ?? '';

let amplitudeReady = false;
let appsFlyerReady = false;

export const initAmplitude = async () => {
  if (!AMPLITUDE_API_KEY || amplitudeReady) return;
  try {
    await amplitude.init(AMPLITUDE_API_KEY, undefined, {
      trackingOptions: { ipAddress: false },
      serverZone: 'EU',
    }).promise;
    amplitudeReady = true;
    console.log('📊 Amplitude: initialized');
  } catch (error) {
    console.error('Amplitude init error:', error);
  }
};

export interface AcquisitionData {
  acquisition_status: 'organic' | 'non-organic' | 'unknown';
  acquisition_source: string;
  acquisition_campaign: string | null;
  acquisition_adset: string | null;
  acquisition_date: string;
}

let pendingAcquisitionData: AcquisitionData | null = null;

export const getPendingAcquisitionData = () => pendingAcquisitionData;
export const clearPendingAcquisitionData = () => { pendingAcquisitionData = null; };

export const initAppsFlyer = () => {
  if (!AF_DEV_KEY || appsFlyerReady) return;

  appsFlyer.onInstallConversionData((data) => {
    try {
      const conversionData = data?.data ?? {};
      const isOrganic = conversionData['af_status'] === 'Organic';

      pendingAcquisitionData = {
        acquisition_status: isOrganic ? 'organic' : conversionData['af_status'] ? 'non-organic' : 'unknown',
        acquisition_source: isOrganic ? 'organic' : (conversionData['media_source'] ?? 'unknown'),
        acquisition_campaign: conversionData['campaign'] ?? null,
        acquisition_adset: conversionData['adset'] ?? null,
        acquisition_date: new Date().toISOString(),
      };
      console.log('📊 AppsFlyer: conversion data received', pendingAcquisitionData);
    } catch (e) {
      console.error('AppsFlyer conversion data error:', e);
    }
  });

  appsFlyer.initSdk({
    devKey: AF_DEV_KEY,
    isDebug: false,
    appId: Platform.OS === 'ios' ? AF_APP_ID : undefined,
    onInstallConversionDataListener: true,
    onDeepLinkListener: false,
  }, () => {
    appsFlyerReady = true;
    console.log('📊 AppsFlyer: initialized');
  }, (error) => {
    console.error('AppsFlyer init error:', error);
  });
};

const amp = (eventName: string, props?: Record<string, any>) => {
  if (!amplitudeReady) return;
  try {
    amplitude.track(eventName, props);
  } catch (error) {
    console.error('Amplitude track error:', error);
  }
};

const af = (eventName: string, props?: Record<string, any>) => {
  if (!appsFlyerReady) return;
  try {
    appsFlyer.logEvent(eventName, props ?? {}, () => {}, () => {});
  } catch (error) {
    console.error('AppsFlyer track error:', error);
  }
};

export const Analytics = {
  logScreenView: async (screenName: string) => {
    try {
      await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
      amp('screen_view', { screen_name: screenName });
      console.log(`📊 Analytics: Screen view logged - ${screenName}`);
    } catch (error) {
      console.error('Analytics error (logScreenView):', error);
    }
  },

  logEvent: async (eventName: string, params?: Record<string, any>) => {
    try {
      await analytics().logEvent(eventName, params);
      amp(eventName, params);
      af(eventName, params);
      console.log(`📊 Analytics: Event logged - ${eventName}`, params);
    } catch (error) {
      console.error('Analytics error (logEvent):', error);
    }
  },

  logTaskCreated: async (taskType?: string) => {
    await Analytics.logEvent('task_created', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  logTaskCompleted: async (taskType?: string) => {
    await Analytics.logEvent('task_completed', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  logTaskDeleted: async (taskType?: string) => {
    await Analytics.logEvent('task_deleted', {
      task_type: taskType || 'general',
      timestamp: Date.now(),
    });
  },

  logBabyJoined: async () => {
    await Analytics.logEvent('baby_joined', { timestamp: Date.now() });
  },

  logBabyCreated: async () => {
    await Analytics.logEvent('baby_created', { timestamp: Date.now() });
  },

  logSignIn: async (method: 'email' | 'google' | 'apple') => {
    try {
      await analytics().logLogin({ method });
      amp('sign_in', { method });
      af('sign_in', { method });
      console.log(`📊 Analytics: User signed in - ${method}`);
    } catch (error) {
      console.error('Analytics error (logSignIn):', error);
    }
  },

  logSignUp: async (method: 'email' | 'google' | 'apple') => {
    try {
      await analytics().logSignUp({ method });
      amp('sign_up', { method });
      af('sign_up', { method });
      console.log(`📊 Analytics: User signed up - ${method}`);
    } catch (error) {
      console.error('Analytics error (logSignUp):', error);
    }
  },

  setUserProperty: async (name: string, value: string) => {
    try {
      await analytics().setUserProperty(name, value);
      const identify = new amplitude.Identify();
      identify.set(name, value);
      amplitude.identify(identify);
      console.log(`📊 Analytics: User property set - ${name}: ${value}`);
    } catch (error) {
      console.error('Analytics error (setUserProperty):', error);
    }
  },

  setUserId: async (userId: string) => {
    try {
      await analytics().setUserId(userId); // Firebase uniquement, pas Amplitude
      appsFlyer.setCustomerUserId(userId, () => {}); // Lie l'attribution AppsFlyer à l'utilisateur
    } catch (error) {
      console.error('Analytics error (setUserId):', error);
    }
  },

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
