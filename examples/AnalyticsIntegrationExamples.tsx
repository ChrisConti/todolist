import React, { useEffect } from 'react';
import Analytics from '../services/analytics';

/**
 * Example: Tracking in Home Screen
 */
export function HomeScreenExample() {
  useEffect(() => {
    // Track screen view on mount
    Analytics.logScreenView('Home');
  }, []);

  const handleTaskCreated = (taskType: string) => {
    // Track when user creates a task
    Analytics.logTaskCreated(taskType);
  };

  return null; // Your existing Home component
}

/**
 * Example: Tracking in Task Detail
 */
export function TaskDetailExample() {
  useEffect(() => {
    Analytics.logScreenView('TaskDetail');
  }, []);

  const handleTaskComplete = (taskId: string) => {
    // Your existing completion logic...
    
    // Track completion
    Analytics.logTaskCompleted('diaper');
  };

  const handleTaskDelete = () => {
    // Your existing delete logic...
    
    // Track deletion
    Analytics.logTaskDeleted();
  };

  return null; // Your existing TaskDetail component
}

/**
 * Example: Tracking in Sign In
 */
export function SignInExample() {
  useEffect(() => {
    Analytics.logScreenView('SignIn');
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      // Your existing sign in logic...
      const user = { uid: 'user123' }; // Replace with actual user
      
      // Track sign in
      await Analytics.logSignIn('email');
      await Analytics.setUserId(user.uid);
      
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return null; // Your existing SignIn component
}

/**
 * Example: Tracking in Baby Management
 */
export function BabyManagementExample() {
  useEffect(() => {
    Analytics.logScreenView('ManageBaby');
  }, []);

  const handleBabyCreated = () => {
    // Your existing baby creation logic...
    
    // Track baby creation
    Analytics.logBabyCreated();
  };

  const handleBabyJoined = () => {
    // Your existing baby join logic...
    
    // Track baby join
    Analytics.logBabyJoined();
  };

  return null; // Your existing ManageBaby component
}

/**
 * Example: Custom Event Tracking
 */
export function CustomEventsExample() {
  const trackButtonClick = (buttonName: string) => {
    Analytics.logEvent('button_clicked', {
      button_name: buttonName,
      screen: 'Settings',
      timestamp: Date.now(),
    });
  };

  const trackFeatureUsage = (featureName: string) => {
    Analytics.logEvent('feature_used', {
      feature: featureName,
      user_type: 'premium', // or get from user context
    });
  };

  const trackError = (errorMessage: string, errorCode?: string) => {
    Analytics.logEvent('app_error', {
      error_message: errorMessage,
      error_code: errorCode,
      screen: 'Current Screen Name',
    });
  };

  return null;
}

/**
 * Example: Navigation Tracking (React Navigation)
 */
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';

const navigationRef = React.createRef<NavigationContainerRef<any>>();

export function AppWithNavigationTracking() {
  const onNavigationReady = () => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName) {
      Analytics.logScreenView(currentRouteName);
    }
  };

  const onNavigationStateChange = () => {
    const previousRouteName = navigationRef.current?.getCurrentRoute()?.name;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      Analytics.logScreenView(currentRouteName);
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
      {/* Your navigation stack */}
    </NavigationContainer>
  );
}

/**
 * Example: User Properties
 */
export function UserPropertiesExample(userId: string, userType: 'parent' | 'guardian') {
  useEffect(() => {
    // Set user ID for all future events
    Analytics.setUserId(userId);

    // Set user properties for segmentation
    Analytics.setUserProperty('user_type', userType);
    Analytics.setUserProperty('app_version', '1.0.4');
    Analytics.setUserProperty('platform', 'ios'); // or 'android'
  }, [userId, userType]);

  return null;
}

/**
 * Example: E-commerce / Premium Features
 */
export function PremiumFeatureExample() {
  const trackPremiumUpgrade = (plan: string, price: number) => {
    Analytics.logEvent('purchase', {
      item_id: plan,
      item_name: `Premium ${plan}`,
      currency: 'USD',
      value: price,
    });
  };

  const trackTrialStart = () => {
    Analytics.logEvent('trial_started', {
      trial_duration: '7_days',
      timestamp: Date.now(),
    });
  };

  return null;
}
