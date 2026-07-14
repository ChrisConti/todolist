import React, { useContext, useEffect, useRef, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet, View, ActivityIndicator, Platform, StatusBar } from 'react-native';
import i18n from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import BabyList from './screens/Home';
import Connection from './Connection';
import SignIn from './SignIn';
import CreateTask from './screens/CreateTask';
import FirstTaskBiberon from './screens/FirstTaskBiberon';
import UpdateTask from './screens/UpdateTask';
import Settings from './Settings';
import Baby from './Baby';
import BabyState from './BabyState';
import BabyTab from './BabyTab';
import EditBaby from './EditBaby';
import EditBabyPhoto from './screens/EditBabyPhoto';
import ChangeName from './screens/ChangeName';
import EmailOptIn from './screens/EmailOptIn';
import ChangeEmail from './screens/ChangeEmail';
import DeleteAccount from './screens/DeleteAccount';
import ChangePassword from './screens/ChangePassword';
import PasswordForgotten from './PasswordForgotten';
import JoinBaby from './JoinBaby';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import { ReviewPromptProvider } from './Context/ReviewPromptContext';
import { PremiumProvider } from './Context/PremiumContext';
import PaywallScreen from './screens/PaywallScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, userRef } from './config';
import { query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsOfUse from './screens/TermsOfUse';
import ExportTasks from './screens/ExportTasks';
import BiberonInsights from './screens/BiberonInsights';
import CategoryDetail from './screens/CategoryDetail';
import Statistics from './screens/Statistics';
import { useTranslation } from 'react-i18next';
import { log } from './utils/logger';
import { APP_INIT_TIMEOUT } from './utils/constants';
import { Ionicons } from '@expo/vector-icons';
import BabyHeadIcon from './components/BabyHeadIcon';
import { trackFirstOpen } from './utils/firstOpenTracker';
import { configureGoogleSignIn } from './utils/socialAuth';
import Analytics, { initAmplitude, initAppsFlyer, getPendingAcquisitionData, clearPendingAcquisitionData } from './services/analytics';
import Constants from 'expo-constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, setUser } = useContext(AuthentificationUserContext);
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Pacifico: Pacifico_400Regular,
  });

  // Store unsubscribe so the auth listener is properly cleaned up on unmount
  const unsubscribeAuthRef = useRef<(() => void) | null>(null);
  const navigationRef = useRef<any>(null);
  const currentScreenRef = useRef<string>('');
  const screenEnterTimeRef = useRef<number>(0);

  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      const timeoutId = setTimeout(() => {
        log.error('App initialization timeout', 'App.tsx');
        setIsLoading(false);
      }, APP_INIT_TIMEOUT);

      try {
        log.info('Starting initialization...', 'App.tsx');

        // Configure Google Sign-In
        configureGoogleSignIn();

        // Initialize Amplitude + AppsFlyer
        initAmplitude();
        initAppsFlyer();

log.debug('Setting up authentication listener...', 'App.tsx');
        unsubscribeAuthRef.current = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              log.info(`User authenticated: ${firebaseUser.uid}`, 'App.tsx');

              // Identify user in analytics
              Analytics.setUserId(firebaseUser.uid);
              Analytics.setUserProperty('platform', Platform.OS);

              // Verify token is still valid
              try {
                await firebaseUser.getIdToken(true);
                log.debug('Token refreshed successfully', 'App.tsx');
              } catch (tokenError) {
                log.error('Token refresh failed, signing out', 'App.tsx', tokenError);
                await auth.signOut();
                setUser(null);
                setIsLoading(false);
                return;
              }

              // Track first open now that user is authenticated
              trackFirstOpen().catch(err => {
                log.error('First open tracking failed (non-critical)', 'App.tsx', err);
              });

              setUser(firebaseUser);

              // Persist last login date + acquisition data on User document (non-critical)
              try {
                const userQuery = query(userRef, where('userId', '==', firebaseUser.uid));
                const userSnap = await getDocs(userQuery);
                if (!userSnap.empty) {
                  const userDocData = userSnap.docs[0].data();
                  const updates: Record<string, any> = {
                    lastLoginDate: new Date().toISOString(),
                    platform: Platform.OS,
                    appVersion: Constants.expoConfig?.version ?? null,
                  };

                  // Save acquisition data only once (first install)
                  if (!userDocData.acquisition_status) {
                    const acquisitionData = getPendingAcquisitionData();
                    if (acquisitionData) {
                      Object.assign(updates, acquisitionData);
                      clearPendingAcquisitionData();
                    }
                  }

                  await updateDoc(doc(db, 'Users', userSnap.docs[0].id), updates);
                }
              } catch {
                // Non-critical
              }
            } else {
              log.info('No user authenticated', 'App.tsx');
              setUser(null);
            }
          } catch (error) {
            log.error('Error in auth state change handler', 'App.tsx', error);
            setUser(null);
          } finally {
            setIsLoading(false);
          }
        }, (error) => {
          log.error('Auth state listener error', 'App.tsx', error);
          setIsLoading(false);
        });

      } catch (e) {
        log.error('Error during app initialization', 'App.tsx', e);
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
        log.debug('Hiding splash screen...', 'App.tsx');
        await SplashScreen.hideAsync();
        log.info('Splash screen hidden - App should be visible now', 'App.tsx');
      }
    }

    loadResourcesAndDataAsync();

    return () => {
      unsubscribeAuthRef.current?.();
    };
  }, []);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const onNavigationReady = () => {
    const name = navigationRef.current?.getCurrentRoute()?.name ?? '';
    currentScreenRef.current = name;
    screenEnterTimeRef.current = Date.now();
    Analytics.logScreenView(name);
  };

  const onNavigationStateChange = () => {
    const name = navigationRef.current?.getCurrentRoute()?.name ?? '';
    if (name && name !== currentScreenRef.current) {
      const duration = Date.now() - screenEnterTimeRef.current;
      Analytics.logEvent('screen_exit', {
        screen: currentScreenRef.current,
        duration_sec: Math.round(duration / 1000),
      });
      currentScreenRef.current = name;
      screenEnterTimeRef.current = Date.now();
      Analytics.logScreenView(name);
    }
  };

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <NavigationContainer
          ref={navigationRef}
          onReady={onNavigationReady}
          onStateChange={onNavigationStateChange}
        >
          <StatusBar barStyle="light-content" backgroundColor="#C75B4A" />
          {isLoading ? (
            <AuthStack /> //loader a mettre
          ) : !user ? (
            <AuthStack />
          ) : (
            <MainStack />
          )}
        </NavigationContainer>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

function AuthStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator initialRouteName='Connection' id={undefined}>
      <Stack.Screen 
        name="Connection" 
        component={Connection} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SignIn" 
        component={SignIn}
        options={{
          headerStyle: { backgroundColor: '#C75B4A',  },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('title.signup'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="PasswordForgotten" 
        component={PasswordForgotten}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('title.passwordForgotten'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicy}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('settings.privacyPolicy'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="TermsOfUse" 
        component={TermsOfUse}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('termsOfUse.title'),
          headerBackTitle: ''
        }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Baby') {
            return <BabyHeadIcon width={size} height={size} color={color} />;
          }

          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Statistics') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#C75B4A',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#FDF1E7',
          borderTopColor: '#E8D5C4',
          height: Platform.OS === 'android' ? 80 + insets.bottom : 80,
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : 10,
          paddingTop: 10,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={BabyList}
        options={{
          tabBarLabel: t('title.activities') || 'Activités',
        }}
      />
      <Tab.Screen 
        name="Baby" 
        component={BabyTab}
        options={{
          tabBarLabel: t('baby.title') || 'Bébé',
        }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={Statistics}
        options={{
          tabBarLabel: t('title.stats') || 'Stats',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={Settings}
        options={{
          tabBarLabel: t('title.settings') || 'Réglages',
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator initialRouteName='MainTabs' id={undefined}>
      <Stack.Screen 
        name="MainTabs"
        component={TabNavigator} 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreateTask" 
        component={CreateTask} 
        options={{
          headerStyle: styles.headerStyle,
          headerTintColor: '#fff',
          headerTitleStyle: styles.headerTitleStyle,
          headerTitle: t('title.addTask'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="UpdateTask" 
        component={UpdateTask} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.updateTask'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="CreateBaby"
        component={Baby}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.addBaby'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="FirstBiberon"
        component={FirstTaskBiberon}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="BabyState"
        component={BabyState}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.myBaby'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="EditBaby"
        component={EditBaby}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('baby.editProfile'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="EditBabyPhoto"
        component={EditBabyPhoto}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('baby.editPhoto'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="EmailOptIn"
        component={EmailOptIn}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize: 22, color: '#FDF1E7' },
          headerTitle: t('settings.emailOptIn'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="ChangeName"
        component={ChangeName}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.changeName'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="ChangeEmail" 
        component={ChangeEmail}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.changeEmail'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="DeleteAccount" 
        component={DeleteAccount}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.deleteAccount'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePassword}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.changePassword'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="ExportTasks"
        component={ExportTasks}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('export.page.title'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="BiberonInsights"
        component={BiberonInsights}
        options={{ headerShown: false, gestureEnabled: false, animationEnabled: false }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetail}
        options={{ headerShown: false, gestureEnabled: false, animationEnabled: false }}
      />
      <Stack.Screen
        name="JoinBaby"
        component={JoinBaby} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.joinBaby'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicy}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('settings.privacyPolicy'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUse}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('termsOfUse.title'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthentificationUserProvider>
        <PremiumProvider>
          <ReviewPromptProvider>
            <RootNavigator />
          </ReviewPromptProvider>
        </PremiumProvider>
      </AuthentificationUserProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerStyle: {
    backgroundColor: '#C75B4A',
  },

  headerTitleStyle: {
    fontFamily: 'Pacifico',
    fontSize: 22,
    color: '#FDF1E7',
  },
});