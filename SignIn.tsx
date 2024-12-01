import { View, Text, TextInput, TouchableOpacity, GestureResponderEvent, StyleSheet } from 'react-native'
import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './config';
import { addDoc, collection } from 'firebase/firestore';

const SignIn = ({navigation}) => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userError, setError] = useState('');
  
  const onHandleRegister = () => {
    //check data 
    const emailRegex = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidEmail = emailRegex.test(email);
      //console.log(isValidEmail)

    if (!email || !isValidEmail) {
        setError('Please enter an email valid');
        return;
      }

      if (password.length < 5) {
        setError("Password too short, min 5 caracter")
        return;
      }
    
    if (name.length < 2) {
      setError('Name min 2 caracter');
        return;
    }
  
            createUserWithEmailAndPassword(auth, email, password).then(
              async (res) => {
                console.log('**************   User created successfully   ******************');
                await addDoc(collection(db, "Users"), {
                  userId: res.user.uid,
                  email: res.user.email,
                  username: name,
                  BabyID : '',
                })
              }
              
            ).catch((error) => {
              //const errorCode = error.code;
              //const errorMessage = error.message;
              console.log(error.code)
              error.code =="auth/email-already-in-use" ? setError("Email already used. Please sign up") : ""
              // ..
            })
  }

    function handSignIn(event: GestureResponderEvent): void {
        throw new Error('Function not implemented.')
    }

  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>
      <View>
      <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={(text) => setEmail(text)}
            />
      {/* Password Input */}
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
            
    <TextInput
        style={styles.input}
        placeholder="Name"
        keyboardType="email-address"
        autoCapitalize="none"
        value={name}
        onChangeText={(text) => setName(text)}
      />
      </View>
      <View>
          <Text style={styles.errorText}>{userError}</Text>
      </View>

      {/* Connection Button */}
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
        <TouchableOpacity style={styles.button} onPress={onHandleRegister}>
          <Text style={styles.buttonText}>Valider</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  )
}

const styles = StyleSheet.create({
    // ... (existing styles)
  
    socialIconsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 20,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f0f8ff', // Light blue background
      },
      logoContainer: {
        marginBottom: 30,
      },
      logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0074e4', // Dark blue logo text
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
      createAccountLink: {
        color: '#0074e4', // Dark blue link color
        fontSize: 14,
      },
      errorText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
      }
  });

export default SignIn