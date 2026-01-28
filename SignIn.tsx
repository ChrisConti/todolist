import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth, db } from './config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import analytics from './services/analytics';
import * as Localization from 'expo-localization';

const SignIn = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus sur le champ email
    setTimeout(() => emailInputRef.current?.focus(), 100);
  }, []);

  const onHandleRegister = async () => {
    if (loading) return; // Prévenir double-soumission
    
    const emailRegex = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|("..+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidEmail = emailRegex.test(email.trim());

    if (!email || !isValidEmail) {
      setError(t('error.invalidEmail'));
      return;
    }

    // Validation password : min 6 caractères
    if (password.length < 6) {
      setError(t('error.shortPassword'));
      return;
    }

    // Validation nom : trim et vérifier non vide
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError(t('error.shortName'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Créer l'utilisateur dans Firebase Auth et Firestore de manière atomique
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);

      try {
        // Récupérer le pays de l'utilisateur
        const userCountry = Localization.region || 'Unknown';

        // Vérifier si un document User existe déjà pour cet userId
        const userQuery = query(
          collection(db, "Users"),
          where('userId', '==', res.user.uid)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          // Document User existe déjà - situation anormale, il faut faire un rollback
          console.error('❌ User document already exists for:', res.user.uid);

          // ROLLBACK : Supprimer le compte Auth qu'on vient de créer
          try {
            await res.user.delete();
            console.log('🔄 Auth user deleted - document already existed');
          } catch (deleteError) {
            console.error('❌ CRITICAL: Failed to delete auth user', deleteError);
          }

          setError(t('error.userDocumentExists') || 'An account already exists. Please try logging in.');
          setLoading(false);
          return;
        } else {
          // CRITIQUE : Créer le document User dans Firestore
          const userDocRef = await addDoc(collection(db, "Users"), {
            userId: res.user.uid,
            email: res.user.email,
            username: trimmedName,
            BabyID: '',
            country: userCountry,
            creationDate: new Date(),
          });

          console.log('✅ User document created successfully:', userDocRef.id);
        }

        analytics.logEvent('user_signup', {
          user_id: res.user.uid,
          method: 'email',
          country: userCountry
        });
        
        setLoading(false);
        
        // onAuthStateChanged dans App.tsx va gérer la navigation automatique
        
      } catch (firestoreError: any) {
        // ROLLBACK : Si Firestore échoue, supprimer l'utilisateur Auth
        console.error('❌ Failed to create User document, rolling back auth user', firestoreError);

        // Vérifier si c'est l'erreur "document already exists"
        if (firestoreError.message && firestoreError.message.includes('Document already exists')) {
          console.log('⚠️ Document already exists - this should not happen with the check above');
          setError(t('error.userDocumentExists') || 'An account already exists. Please try logging in.');
          setLoading(false);
          return;
        }

        try {
          await res.user.delete();
          console.log('🔄 Auth user deleted after Firestore failure');
        } catch (deleteError) {
          console.error('❌ CRITICAL: Failed to delete auth user during rollback', deleteError);
          // Situation critique : utilisateur Auth existe sans document Firestore
          setError(t('error.criticalAccountError') || 'Critical error. Please contact support.');
          setLoading(false);
          return;
        }

        setError(t('error.databaseError') || 'Database error. Please try again later.');
        setLoading(false);

        analytics.logEvent('signup_error', {
          error_code: 'firestore_creation_failed',
          error_type: 'firestore_error'
        });
      }
    } catch (error: any) {
      console.error('❌ Auth account creation failed:', error);
      setLoading(false);
      
      if (error.code === "auth/email-already-in-use") {
        setError(t('error.emailAlreadyRegistered') || 'This email is already registered');
      } else if (error.code === "auth/network-request-failed") {
        setError(t('error.networkError') || 'Network error. Check your connection.');
      } else if (error.code === "auth/invalid-email") {
        setError(t('error.invalidEmail'));
      } else {
        setError(t('error.general') + ` (${error.code})`);
      }
      
      analytics.logEvent('signup_error', {
        error_code: error.code,
        error_type: error.code === "auth/email-already-in-use" ? 'email_in_use' :
                   error.code === "auth/network-request-failed" ? 'network_error' : 'general'
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder={t('placeholder.email')}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder={t('placeholder.password')}
                secureTextEntry={true}
                autoCorrect={false}
                autoCapitalize="none"
                textContentType="password"
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder={t('placeholder.name')}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.conditionsLabel}>{t('conditions.label')}</Text>

              <View style={styles.linksContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('TermsOfUse')}
                  disabled={loading}
                  style={styles.linkSpacing}
                >
                  <Text style={styles.linkText}>{t('settings.termsOfUse')}</Text>
                </TouchableOpacity>
              </View>

              {userError !== '' && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{userError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onHandleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#F6F0EB" />
                ) : (
                  <Text style={styles.buttonText}>{t('button.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FDF1E7',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FDF1E7',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginTop: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  conditionsLabel: {
    color: '#7A8889',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  linksContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#C75B4A',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkSpacing: {
    marginTop: 10,
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
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#F6F0EB',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Pacifico',
  },
});