import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Linking } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scrollview';
import React, { useContext, useEffect, useState } from 'react'
import ItemParameter from "./ItemParameter.js"
import { auth, userRef } from './config.js';
import AuthentificationUserProvider, {AuthentificationUserContext} from './Context/AuthentificationContext';
import { deleteUser, signOut } from 'firebase/auth';
import { getDocs, query, where } from 'firebase/firestore';
import WebView from 'react-native-webview';

export default function Settings({navigation}) {
  const {user, setUser, babyID, setBabyID, setUserInfo} = useContext(AuthentificationUserContext);
  const [babyExist, setBabyExist] = useState(babyID ? true : false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSignOut = ()=>{
    signOut(auth)
      .then(() => {
        setUser(null);
        setBabyID(null)
        setUserInfo(null)
        //navigation.navigate("Connection");
      })
      .catch((error) => {
        Alert.alert(error.message);
      });
  };

  const handleContactUs = () => { 
    const email = 'your-email@example.com'; 
    const subject = 'Contact Us'; 
    const body = 'Hi there, I would like to...'; 
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; 
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err)); 
  };

  const handleOpenWebsite = () => { 
    const url = 'https://www.your-website.com'; 
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err)); 
  };

  const handleOpenWebsite2 = () => { 
    const url = 'https://www.your-website.com'; 
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err)); 
  };

  const queryResult = query(userRef, where('userId', '==', user.uid));


  useEffect(()=> {
    console.log(babyExist)
    //GetUserInfo(queryResult)
  
    return () => {
      //getBabies();
    };
    },[]) 


    async function GetUserInfo(queryResult) {
      // get from the user his baby favorite to display it first on home
      try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach((doc) => {
          const { Baby } = doc.data();
          //setBabySelected(Baby.ID);
          //console.log('ID' + Baby.ID)
          Baby.ID ? setBabyExist(true) : setBabyExist(false)
      //return BabyID
      });
      } catch (error) {
          
      }
  }

  return (
   <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <View>
        <View>
          <Text 
          style={styles.titleParameter}
          
          >Option bébé</Text>
        </View>
        <View>
        {babyExist ? 
          <TouchableOpacity onPress={() => navigation.navigate('BabyState')}>
            <ItemParameter title="Mon bébé" icon='child'/>  
          </TouchableOpacity>
        : 
        <View>

        <TouchableOpacity onPress={() => navigation.navigate('Baby')}>
            <ItemParameter title="Créer un bébé" icon='plus'/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('JoinBaby')}>
              <ItemParameter title="Rejoindre un bébé" icon='share'/>  
          </TouchableOpacity>
          </View>
        }
        </View>
      </View>

      <View>
        <View >
          <Text style={styles.titleParameter}>Option personnelles</Text>
        </View>
        <View>
          <TouchableOpacity onPress={() => navigation.navigate('ChangeName')}>
              <ItemParameter title="Mon nom" icon="user"/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ChangeEmail')}>
              <ItemParameter title="Mon email" icon="envelope"/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')}>
              <ItemParameter title="Mon mot de passe" icon="lock"/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert('Suppression', 'Etes vous sur de vouloir supprimer votre compte ? Vos données seront effacées et non retrouvables par la suite.', [
              {
                text: 'Annuler',
                onPress: () => console.log('Cancel Pressed'),
                style: 'cancel',
              },
              {text: 'Valider', onPress: () => {
                deleteUser(auth.currentUser).then(() => {
                  // User deleted.
                  console.log('User deleted')
                  signOut(auth)
                    .then(() => {
                      setUser(null);
                      setBabyID(null)
                      setUserInfo(null)
                      navigation.navigate("Connection");
                    })
                    .catch((error) => {
                      Alert.alert(error.message);
                    });
                }).catch((error) => {
                  console.log(error)
                  // An error ocurred
                  // ...
                });
              }},
            ]);
          }

          }>
              <ItemParameter title="Supprimer mon compte" icon="user"/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut}>
              <ItemParameter title="Me déconnecter" icon='arrow-circle-right'/>  
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <View>
          <Text style={styles.titleParameter}>A propos</Text>
        </View>
        <View>
          <TouchableOpacity onPress={handleOpenWebsite}>
              <ItemParameter title="Politique de confidentialité" icon='arrow-circle-right'/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenWebsite2}>
              <ItemParameter title="Conditions générales d'utilisations" icon='arrow-circle-right'/>  
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContactUs}>
              <ItemParameter title="Nous contacter" icon='arrow-circle-right'/>  
          </TouchableOpacity>
          
        </View>
      </View>
    </ScrollView>
   </View>
  )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: 'white',
    },
    titleParameter:{
        color: '#7A8889', // White text color
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom:5,
        marginTop:3
    },
    webview: { flex:1 },
    webViewcontainer: {width:'80%', justifyContent: 'center', alignItems: 'center', backgroundColor:'red' },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', }, modalView: { width: '90%', height: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', },
    closeButton: { alignSelf: 'flex-end', backgroundColor: '#46B0FC', padding: 10, borderRadius: 5, marginBottom: 10, }, closeButtonText: { color: 'white', fontSize: 16, },
  });
