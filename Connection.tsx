import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { SocialIcon } from 'react-social-icons'; // Import the SocialIcon component
import Twitter from "./assets/x.svg";
import Fb from './assets/fb.svg';
import Insta from './assets/insta.svg';
import Google from './assets/insta.svg';
import Logo from './assets/logo.svg';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';


const ConnectionScreen = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userError, setError] = useState('');
  const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

  const handleLogin = () => {
    // Implement your login logic here
    // For now, let's just navigate to the home screen
    navigation.navigate('Home');
  };

  const handleCreateAccount = () => {
    // Navigate to the account creation screen
    navigation.navigate('CreateAccount');
  };

  function handleConnection(event: GestureResponderEvent): void {
    if (email !== "" && password !== "") {

      signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        setUser(user)
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(error.code)
        error.code =="auth/invalid-credential" ? setError("Email not existing. Please sign up") : ""
      });
    }
    else {
      setError("Email or password empty")
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        {/* Replace with your logo */}
        <Logo height={200} width={200} />
        <Text style={styles.logoText}>Welcome</Text>
      </View>

      {/* Email Input */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(text) => setEmail(text)}
      />
      
      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={(text) => setPassword(text)}
      />
      <View style={{marginBottom:5}}>
          <Text style={styles.errorText}>{userError}</Text>
      </View>

      {/* Connection Button */}
      <TouchableOpacity style={styles.button} onPress={handleConnection}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>

      {/* Social Media Icons 
      <View style={styles.socialIconsContainer}>
          <TouchableOpacity >
            <Twitter height={45} width={45} />
          </TouchableOpacity>
          <TouchableOpacity >
            <Fb height={45} width={45} />
          </TouchableOpacity>
          <TouchableOpacity >
            <Insta height={45} width={45} />
          </TouchableOpacity>
          <TouchableOpacity >
            <Google height={45} width={45} />
          </TouchableOpacity>    
      </View>
        */}
      {/* Create Account Link */}
        <View style={{marginBottom:5}}>
          <Text>Vous avez déjà un compte ?</Text>
        </View>

      <TouchableOpacity style={styles.button} onPress={() =>{
        setError("")
        navigation.navigate('SignIn')
      } }>
        <Text style={styles.buttonText}>S'inscrire</Text>
      </TouchableOpacity>

    </View>
  );
};

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
    borderWidth: 1,
    borderColor: '#ccc',
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
    width:200
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

export default ConnectionScreen;
