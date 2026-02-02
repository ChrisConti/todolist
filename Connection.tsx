import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, GestureResponderEvent, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Logo from './assets/logo.svg';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
// import * as Sentry from '@sentry/react-native';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, signInWithApple } from './utils/socialAuth';
import * as AppleAuthentication from 'expo-apple-authentication';

const ConnectionScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const { user, setUser, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();

  useEffect(() => {
    // Sentry.captureException(new Error('Connection'))
    if (user) {
      navigation.navigate('Home');
    }

    // Check if Apple Sign-In is available (iOS 13+)
    const checkAppleAuth = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(available);
    };
    checkAppleAuth();
  } , []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await signInWithGoogle();
      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error('Google Sign-In failed', error);
      // Error already handled in signInWithGoogle
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await signInWithApple();
      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error('Apple Sign-In failed', error);
      // Error already handled in signInWithApple
    } finally {
      setLoading(false);
    }
  };

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#C75B4A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#C75B4A' }}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
            <Text style={styles.logoText}>Tribu Baby</Text>

        {/* Social Auth Buttons */}
        {appleAuthAvailable && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>🍎  Continuer avec Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>🔵  Continuer avec Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
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
          autoCorrect={false}
          autoCapitalize="none"
          textContentType="password"
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

            <View style={styles.logoContainer}>
              <Logo height={120} width={120} />
            </View>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    color: '#F6F0EB',
    fontFamily: 'Pacifico',
    textAlign: 'center',
    marginBottom: 40,
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
    fontFamily: 'Pacifico',
  },
  socialButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F6F0EB',
    opacity: 0.3,
  },
  dividerText: {
    color: '#F6F0EB',
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Pacifico',
  },
});

export default ConnectionScreen;