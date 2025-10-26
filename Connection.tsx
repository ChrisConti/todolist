import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, GestureResponderEvent, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Logo from './assets/logo.svg';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';
import * as Sentry from '@sentry/react-native';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';

const ConnectionScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const { user, setUser, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();

  useEffect(() => {
    Sentry.captureException(new Error('Connection'))
    if (user) {
      navigation.navigate('Home');
    }

  } , []);

  const handleLogin = () => {
    navigation.navigate('Home');
  };

  const handleCreateAccount = () => {
    navigation.navigate('CreateAccount');
  };

  function handleConnection(event: GestureResponderEvent): void {
    if (email !== '' && password !== '') {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          setUser(user);
        })
        .catch((error) => {
          if (error.code === 'auth/invalid-credential') {
            setError(t('error.invalidCredential'));
          } else if (error.code === 'auth/wrong-password') {
            console.log(error.message);
            setError(t('error.test'));
          } else {
            console.log(error.message);
            setError(t('error.general'));
          }
        });
    } else {
      setError(t('error.emptyFields'));
    }
  }

  function onHandleForgetPassword() {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log('success');
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Logo height={200} width={200} />
          <Text style={styles.logoText}>Tribu Baby</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('placeholder.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder={t('placeholder.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={{marginLeft: 180}} onPress={() => navigation.navigate('PasswordForgotten')}>
          <Text style={{ color: '#F6F0EB' }}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 5 }}>
          <Text style={styles.errorText}>{userError}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleConnection}>
          <Text style={styles.buttonText}>{t('button.login')}</Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 5 }}>
          <Text style={{ color: '#F6F0EB' }}>{t('noAccount')}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => {
          setError('');
          navigation.navigate('SignIn');
        }}>
          <Text style={styles.buttonText}>{t('button.signup')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#C75B4A',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F6F0EB',
    marginLeft: 25,
    fontFamily: 'Pacifico',
    paddingLeft:30
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#FDF1E7',
  },
  button: {
    backgroundColor: '#FDF1E7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 200,
  },
  buttonText: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pacifico'
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConnectionScreen;