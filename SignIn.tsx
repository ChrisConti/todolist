import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth, db } from './config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
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
    analytics.logScreenView('SignIn');
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
        
        analytics.logEvent('user_signup', {
          userId: res.user.uid,
          method: 'email',
          country: userCountry
        });
        
        setLoading(false);
        
        // onAuthStateChanged dans App.tsx va gérer la navigation automatique
        
      } catch (firestoreError) {
        // ROLLBACK : Si Firestore échoue, supprimer l'utilisateur Auth
        console.error('❌ Failed to create User document, rolling back auth user', firestoreError);
        
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
          errorCode: 'firestore_creation_failed',
          errorType: 'firestore_error'
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
        errorCode: error.code,
        errorType: error.code === "auth/email-already-in-use" ? 'email_in_use' : 
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
        <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
          <View>
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
          />
          <TextInput
            style={styles.input}
            placeholder={t('placeholder.name')}
            autoCapitalize="none"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexDirection: 'column',
        }}>
           <Text>{t('conditions.label')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} style={{}}>
            <Text style={{color:'#C75B4A', alignSelf:'center'}}>{t('settings.privacyPolicy')}</Text> 
          </TouchableOpacity> 
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')} style={{}}>
            <Text style={{color:'#C75B4A', alignSelf:'center'}}>{t('settings.termsOfUse')}</Text> 
          </TouchableOpacity> 
          <Text style={styles.errorText}>{userError}</Text>
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
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FDF1E7',
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 250,
  },
  buttonDisabled: {
    backgroundColor: '#D8ABA0',
    opacity: 0.7,
  },
  buttonText: {
    color: '#F6F0EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
});