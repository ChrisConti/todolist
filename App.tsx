import React, { useContext, useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
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
import UpdateTask from './screens/UpdateTask';
import Settings from './Settings';
import Baby from './Baby';
import BabyState from './BabyState';
import BabyTab from './BabyTab';
import EditBaby from './EditBaby';
import EditBabyPhoto from './screens/EditBabyPhoto';
import ChangeName from './screens/ChangeName';
import ChangeEmail from './screens/ChangeEmail';
import DeleteAccount from './screens/DeleteAccount';
import ChangePassword from './screens/ChangePassword';
import PasswordForgotten from './PasswordForgotten';
import JoinBaby from './JoinBaby';
import ManageBaby from './ManageBaby';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import { ReviewPromptProvider } from './Context/ReviewPromptContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsOfUse from './screens/TermsOfUse';
import AnalyticsTest from './screens/AnalyticsTest';
import ExportTasks from './screens/ExportTasks';
import Statistics from './screens/Statistics';
import { useTranslation } from 'react-i18next';
import { log } from './utils/logger';
import { APP_INIT_TIMEOUT } from './utils/constants';
import { Ionicons } from '@expo/vector-icons';
import BabyHeadIcon from './components/BabyHeadIcon';
import { trackFirstOpen } from './utils/firstOpenTracker';
import { configureGoogleSignIn } from './utils/socialAuth';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, setUser } = useContext(AuthentificationUserContext);
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Pacifico: Pacifico_400Regular,
  });

  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      const timeoutId = setTimeout(() => {
        log.error('App initialization timeout', 'App.tsx');
        alert('Timeout: App is taking too long to load. Check console for errors.');
        setFontsLoaded(true);
        setIsLoading(false);
      }, APP_INIT_TIMEOUT);

      try {
        log.info('Starting initialization...', 'App.tsx');

        // Configure Google Sign-In
        configureGoogleSignIn();

        // Track first open for download statistics
        trackFirstOpen().catch(err => {
          log.error('First open tracking failed (non-critical)', 'App.tsx', err);
        });

        // Check authentication state with improved handling
        log.debug('Setting up authentication listener...', 'App.tsx');
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              log.info(`User authenticated: ${firebaseUser.uid}`, 'App.tsx');
              
              // Verify token is still valid
              try {
                await firebaseUser.getIdToken(true); // Force refresh
                log.debug('Token refreshed successfully', 'App.tsx');
              } catch (tokenError) {
                log.error('Token refresh failed, signing out', 'App.tsx', tokenError);
                await auth.signOut();
                setUser(null);
                setIsLoading(false);
                return;
              }
              
              setUser(firebaseUser);
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

        // Cleanup function
        return () => {
          unsubscribe();
        };
      } catch (e) {
        log.error('Error during app initialization', 'App.tsx', e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        alert(`Error during initialization: ${errorMessage}`);
        // Continue anyway with fallback
        setFontsLoaded(true);
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
        log.debug('Hiding splash screen...', 'App.tsx');
        await SplashScreen.hideAsync();
        log.info('Splash screen hidden - App should be visible now', 'App.tsx');
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <NavigationContainer>
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
          headerTitle: 'Politique de Confidentialité',
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
        name="Baby" 
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
        name="AnalyticsTest" 
        component={AnalyticsTest}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize:22, color:'#FDF1E7' },
          headerTitle: 'Analytics Test',
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
          headerTitle: 'Politique de Confidentialité',
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

export default function App() {
  return (
    <ErrorBoundary>
      <AuthentificationUserProvider>
        <ReviewPromptProvider>
          <RootNavigator />
        </ReviewPromptProvider>
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
  },
});