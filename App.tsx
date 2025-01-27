import React, { useContext, useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet, View, Text } from 'react-native';
import i18n from './i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BabyList from './screens/Home';
import Connection from './Connection';
import SignIn from './SignIn';
import CreateTask from './screens/CreateTask';
import TaskDetail from './TaskDetail';
import Settings from './Settings';
import Baby from './Baby';
import BabyState from './BabyState';
import ChangeName from './screens/ChangeName';
import ChangeEmail from './screens/ChangeEmail';
import ChangePassword from './screens/ChangePassword';
import PasswordForgotten from './PasswordForgotten';
import JoinBaby from './JoinBaby';
import ManageBaby from './ManageBaby';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://62aac55d9411b8b3dbfa940b450a1b52@o4508643850059776.ingest.de.sentry.io/4508643949805648',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const Stack = createStackNavigator();

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, setUser } = useContext(AuthentificationUserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
    return null; // You can return a custom loading component here if you want
  }

  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer>
        {isLoading ? (
          <AuthStack />
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
          headerTitle: "Inscription",
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
          headerTitle: "Mot de passe oublié",
          headerBackTitle: ''
        }}
      />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator initialRouteName='BabyList' id={undefined}>
      <Stack.Screen 
        name="BabyList"
        component={BabyList} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
        }}
      />
      <Stack.Screen 
        name="CreateTask" 
        component={CreateTask} 
        options={{
          headerStyle: styles.headerStyle,
          headerTintColor: '#fff',
          headerTitleStyle: styles.headerTitleStyle,
          headerTitle: "Ajouter une activité"
        }}
      />
      <Stack.Screen 
        name="TaskDetail" 
        component={TaskDetail} 
        options={{
          headerStyle: { backgroundColor: '#C75B4A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontFamily: 'Pacifico', fontSize:22, color:'#FDF1E7' },
          headerTitle: "Détails",
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
          headerTitle: "Paramètres",
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
          headerTitle: "Créer un bébé",
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
          headerTitle: "Mon bébé",
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
          headerTitle: "Joindre un bébé",
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
          headerTitle: "Mon nom",
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
          headerTitle: "Mon email",
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
          headerTitle: "Mon mot de passe",
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
          headerTitle: "Statistiques",
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