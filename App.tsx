// App.js
import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';
import DetailsScreen from './DetailScreen';
import BabyList from './Home'
import Connection from './Connection'
import SignIn from './SignIn'
import CreateTask from './CreateTask'
import TaskDetail from './TaskDetail'
import Settings from './Settings'
import Baby from './Baby'
import BabyState from './BabyState'
import ChangeName from './ChangeName'
import ChangeEmail from './ChangeEmail'
import ChangePassword from './ChangePassword'
import Timer from './timers'
import JoinBaby from './JoinBaby'
import ManageBaby from './ManageBaby'

import AuthentificationUserProvider, {AuthentificationUserContext} from './Context/AuthentificationContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, userRef, babiesRef } from './config';
import { onSnapshot } from 'firebase/firestore';

const Stack = createStackNavigator();

function RootNavigator(){
  const {user, setUser, babyID, setBabyID, userInfo, setUserInfo} = useContext(AuthentificationUserContext)
  const [isLoading, setIsLoading] = useState(false)

  //Add them to the user
  
  useEffect(() => {
    setIsLoading(true);
    onAuthStateChanged(auth, (user) => {
      if (user) {
        //console.log(user)
        setUser(user);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

  }, []);

  return(
    <NavigationContainer>
      {!user && isLoading === true ? (
        <AuthStack />
      ) : !user && isLoading === false ? (
        <AuthStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthentificationUserProvider>
      <RootNavigator />
    </AuthentificationUserProvider>
  );
};

function AuthStack(){
  return(
        <Stack.Navigator initialRouteName='Connection' >
          <Stack.Screen 
            name="Connection" 
            component={Connection} 
            options={{headerShown: false}}
          />
          <Stack.Screen 
            name="SignIn" 
            component={SignIn}
            options={{
              headerStyle: {
                backgroundColor: '#46B0FC',
              },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerTitle: "Inscription"
              
            }}
          />
        </Stack.Navigator>
  )
}

function MainStack(){
  return(
    <Stack.Navigator 
      initialRouteName='BabyList'>
    <Stack.Screen 
      name="BabyList"
      component={BabyList} 
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    />
    <Stack.Screen name="CreateTask" component={CreateTask} 
    options={{
      headerStyle: {
        backgroundColor: '#46B0FC',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerTitle: "Ajouter une activité"
    }}
    />
        <Stack.Screen name="TaskDetail" component={TaskDetail} 
    options={{
      headerStyle: {
        backgroundColor: '#46B0FC',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerTitle: "Détails"
    }}
    />
    <Stack.Screen 
      name="Settings" 
      component={Settings} 
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        headerTitle: "Paramètres"
      }}
    />
    <Stack.Screen 
      name="Baby" 
      component={Baby} 
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        headerTitle: "Créer un bébé"
      }}
    />
    <Stack.Screen 
      name="BabyState" 
      component={BabyState} 
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        headerTitle: "Mon bébé"
      }}
    />
    <Stack.Screen 
      name="JoinBaby" 
      component={JoinBaby} 
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        headerTitle: "Joindre un bébé"
      }}
    />
    <Stack.Screen 
      name="ChangeName" 
      component={ChangeName}
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: "Mon nom"
        
      }}
    />

<Stack.Screen 
      name="ChangeEmail" 
      component={ChangeEmail}
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: "Mon email"
        
      }}
    />
    <Stack.Screen 
      name="ChangePassword" 
      component={ChangePassword}
      options={{
        headerStyle: {
          backgroundColor: '#46B0FC',
        },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: "Mon mots de passe"
      }}
    />
    <Stack.Screen name="Timer" component={Timer} />
    <Stack.Screen name="ManageBaby" component={ManageBaby} 
    options={{
      headerStyle: {
        backgroundColor: '#46B0FC',
      },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTitle: "Statistiques"
    }}
    />
    <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }}/>
  </Stack.Navigator>
  )
}


