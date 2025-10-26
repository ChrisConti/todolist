// Example: How to add Analytics to your Home screen
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Analytics from './services/analytics';

export default function Home() {
  // Track screen view when component mounts
  useEffect(() => {
    Analytics.logScreenView('Home');
  }, []);

  const handleCreateTask = () => {
    // Your existing task creation logic
    // ...
    
    // Track the event
    Analytics.logTaskCreated('feeding');
  };

  const handleCompleteTask = () => {
    // Your existing task completion logic
    // ...
    
    // Track the event
    Analytics.logTaskCompleted('diaper');
  };

  return (
    <View>
      <Text>Home Screen</Text>
      {/* Your existing UI */}
    </View>
  );
}

// Example: Track user authentication
import { signIn, signUp } from './your-auth-service';

async function handleSignIn(email: string, password: string) {
  try {
    const user = await signIn(email, password);
    
    // Track sign in
    await Analytics.logSignIn('email');
    
    // Set user ID for future tracking
    await Analytics.setUserId(user.uid);
    
    // Set user properties
    await Analytics.setUserProperty('user_type', 'parent');
    
  } catch (error) {
    console.error(error);
  }
}

// Example: Track custom button clicks
const handleButtonClick = (buttonName: string) => {
  Analytics.logEvent('button_clicked', {
    button_name: buttonName,
    screen: 'Home',
    timestamp: Date.now(),
  });
};
