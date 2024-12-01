import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db, userRef } from './config'
import { AuthentificationUserContext } from './Context/AuthentificationContext'
import { getAuth, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from './config.js';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from "react-native-chart-kit";

const ChangeEmail = ({route, navigation}) => {
  const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);
  const [email, setEmail] = useState(user.email)
  const [userError, setError] = useState('');
  const [password, setPassword] = useState("");
  //console.log(navigation)

function updateUserEmail() { 

    const emailRegex = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidEmail = emailRegex.test(email);
      //console.log(isValidEmail)

    if (!email || !isValidEmail) {
        setError('Please enter an email valid');
        return;
      }

    updateEmail(auth.currentUser, email).then(() => {
        // Email updated!
        // ...
        onHandleModification();
        
      }).catch((error) => {
        // An error occurred
        // ...
        console.log(error)
      });

}

/*const onHandleModification = async () => {
    //console.log(JSON.stringify(babyID))
    const queryResult = query(userRef, where('userId', '==', user.uid))
    //console.log('queryResult :' + user.uid)
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        //console.log(document)
        await updateDoc(doc(db, 'Users', document.id),{
          email:email, 
        }).then(() => {
          console.log('success')
        });
      })
      //navigation.navigate('BabyList')
  
    } catch (error) {
      console.error('Error updating document:', error);
    }
  }*/

  

const onHandleModification = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  // Replace 'email' and 'password' with actual values obtained from the user
  const credential = EmailAuthProvider.credential(user.email, password);

  try {
    // Re-authenticate user
    await reauthenticateWithCredential(user, credential);

    const queryResult = query(userRef, where('userId', '==', user.uid));
    console.log('Query result for user:', user.uid);

    const querySnapshot = await getDocs(queryResult);

    const updatePromises = querySnapshot.docs.map(async (document) => {
      return updateDoc(doc(db, 'Users', document.id), {
        email: email,
      });
    });

    await Promise.all(updatePromises);
    
    console.log('Email updated successfully.');
    //navigation.navigate('BabyList');
  } catch (error) {
    // Handle errors related to reauthentication 
    if (error.code === 'auth/wrong-password') { 
      console.error('The password is incorrect. Please try again.'); 
      setError('The password is incorrect. Please try again.');
    } else if (error.code === 'auth/user-mismatch') { 
      console.error('The provided credentials do not match the logged-in user.'); 
    } else if (error.code === 'auth/user-not-found') { 
      console.error('No user found with the provided credentials.'); 
    } else if (error.code === 'auth/requires-recent-login') { 
      console.error('Please re-authenticate to perform this action.'); 
    } else { 
      // Handle any other errors 
      console.error('Error during reauthentication:', error.message); }
  }
};


  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        clearButtonMode='always'
        value={email}
        onChangeText={(text) => setEmail(text)}
      />
      <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={true}
                autoCorrect={false}
                autoCapitalize="none"
                textContentType="password"
                value={password}
                onChangeText={(text) => setPassword(text)}
            />

      {/* Validation Button */}
      <View style={{
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
        alignItems: 'center',
        justifyContent: 'flex-end', // Pushes the button to the bottom
        flexDirection:'column',
      }}>
              <View>
                <Text style={styles.errorText}>{userError}</Text>
              </View>
        <TouchableOpacity style={styles.button} onPress={updateUserEmail}>
          <Text style={styles.buttonText}>Validated</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

}

export default ChangeEmail

const styles = StyleSheet.create({
  container: {
    flex:1, padding:10, backgroundColor:'white'
  },
  button: {
    backgroundColor: '#46B0FC', // Dark blue button background
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width:250
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#46B0FC',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: 'white', // White input background
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  }
  

});
