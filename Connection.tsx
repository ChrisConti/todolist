import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, GestureResponderEvent, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import Logo from './assets/logo.svg';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
// import * as Sentry from '@sentry/react-native';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';

const ConnectionScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setUser, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();

  useEffect(() => {
    // Sentry.captureException(new Error('Connection'))
    if (user) {
      navigation.navigate('Home');
    }

  } , []);

  function handleConnection(event: GestureResponderEvent): void {
    setLoading(true);
    setError('');
    if (email !== '' && password !== '') {
      signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;
          
          // Vérifier si le document User existe dans Firestore
          try {
            const userQuery = query(
              collection(db, "Users"), 
              where('userId', '==', user.uid)
            );
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
              // Document User manquant - le créer maintenant avec un nom par défaut localisé
              console.warn('⚠️ User document missing for:', user.uid, '- creating now');
              
              await addDoc(collection(db, "Users"), {
                userId: user.uid,
                email: user.email,
                username: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
                BabyID: '',
                creationDate: new Date(),
              });
              
              console.log('✅ User document created on login');
            } else {
              console.log('✅ User document exists');
            }
          } catch (firestoreError: any) {
            console.error('❌ Error checking/creating User document:', firestoreError);
            // Continue anyway - don't block login
            // Note: Si le document existe déjà, c'est géré par le check au-dessus
          }
          
          setUser(user);
          setLoading(false);
        })
        .catch((error) => {
          setLoading(false);
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
      setLoading(false);
      setError(t('error.emptyFields'));
    }
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
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder={t('placeholder.password')}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.forgotPasswordLink}
          onPress={() => navigation.navigate('PasswordForgotten')}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        {userError !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{userError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConnection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#7A8889" />
          ) : (
            <Text style={styles.buttonText}>{t('button.login')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupPrompt}>
          <Text style={styles.signupPromptText}>{t('noAccount')}</Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setError('');
            navigation.navigate('SignIn');
          }}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{t('button.signup')}</Text>
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
    paddingLeft: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#FDF1E7',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#F6F0EB',
    fontSize: 14,
  },
  errorContainer: {
    marginBottom: 15,
    width: '100%',
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#FDF1E7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 200,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pacifico',
  },
  signupPrompt: {
    marginBottom: 10,
  },
  signupPromptText: {
    color: '#F6F0EB',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FDF1E7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: 200,
  },
  secondaryButtonText: {
    color: '#FDF1E7',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pacifico',
  },
});

export default ConnectionScreen;