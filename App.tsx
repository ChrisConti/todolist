import React, { useContext, useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import i18n from './i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BabyList from './screens/Home';
import Connection from './Connection';
import SignIn from './SignIn';
import CreateTask from './screens/CreateTask';
import TaskDetail from './TaskDetail';
import UpdateTask from './screens/UpdateTask';
import Settings from './Settings';
import Baby from './Baby';
import BabyState from './BabyState';
import ChangeName from './screens/ChangeName';
import ChangeEmail from './screens/ChangeEmail';
import DeleteAccount from './screens/DeleteAccount';
import ChangePassword from './screens/ChangePassword';
import PasswordForgotten from './PasswordForgotten';
import JoinBaby from './JoinBaby';
import ManageBaby from './ManageBaby';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, babiesRef } from './config';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import * as Sentry from '@sentry/react-native';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsOfUse from './screens/TermsOfUse';
import AnalyticsTest from './screens/AnalyticsTest';
import ExportTasks from './screens/ExportTasks';
import { useTranslation } from 'react-i18next';

Sentry.init({
  dsn: 'https://62aac55d9411b8b3dbfa940b450a1b52@o4508643850059776.ingest.de.sentry.io/4508643949805648',
  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const Stack = createStackNavigator();

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, setUser, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    Sentry.captureException(new Error('First error'))
    async function loadResourcesAndDataAsync() {
      try {
        // Load fonts
        Sentry.captureException(new Error('Second error'))
        await Font.loadAsync({ Pacifico: Pacifico_400Regular });
        setFontsLoaded(true);

        // Check authentication state
        setIsLoading(true);
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setUser(user);
            //babyIDInfo()
          }
          setIsLoading(false);
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide the splash screen
        Sentry.captureException(new Error('hide error'))
        await SplashScreen.hideAsync();
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('termsOfUse.title'),
          headerBackTitle: ''
        }}
      />
    </Stack.Navigator>
  );
}

function MainStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator initialRouteName='BabyList' id={undefined}>
      <Stack.Screen 
        name="BabyList"
        component={BabyList} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerShown: false,
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7', paddingLeft: 20, paddingRight: 20 },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.updateTask'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={Settings} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.settings'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="Baby" 
        component={Baby} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.myBaby'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="ChangeName" 
        component={ChangeName}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: 'Exporter les tâches',
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="JoinBaby" 
        component={JoinBaby} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.joinBaby'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="ManageBaby" 
        component={ManageBaby} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: t('title.babyStats'),
          headerBackTitle: ''
        }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicy}
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
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
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22 },
          headerTitle: t('termsOfUse.title'),
          headerBackTitle: ''
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthentificationUserProvider>
      <RootNavigator />
    </AuthentificationUserProvider>
  );
}

const styles = StyleSheet.create({
  headerStyle: {
    backgroundColor: '#C75B4A',
  },

  headerTitleStyle: {
    fontWeight: 'bold',
    fontFamily: 'Pacifico',
    fontSize: 22,
  },
});