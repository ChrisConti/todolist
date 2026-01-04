import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
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

  useEffect(() => {
    analytics.logScreenView('SignIn');
  }, []);

  const onHandleRegister = () => {
    const emailRegex = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidEmail = emailRegex.test(email);

    if (!email || !isValidEmail) {
      setError(t('error.invalidEmail'));
      return;
    }

    if (password.length < 5) {
      setError(t('error.shortPassword'));
      return;
    }

    if (name.length < 2) {
      setError(t('error.shortName'));
      return;
    }
    
    // Créer l'utilisateur dans Firebase Auth et Firestore de manière atomique
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (res) => {
        try {
          // Récupérer le pays de l'utilisateur
          const userCountry = Localization.region || 'Unknown';
          
          // CRITIQUE : Créer le document User dans Firestore
          const userDocRef = await addDoc(collection(db, "Users"), {
            userId: res.user.uid,
            email: res.user.email,
            username: name,
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
          
          // Success - user peut maintenant naviguer
        } catch (firestoreError) {
          // ROLLBACK : Si Firestore échoue, supprimer l'utilisateur Auth
          console.error('❌ Failed to create User document, rolling back auth user', firestoreError);
          
          try {
            await res.user.delete();
            console.log('🔄 Auth user deleted after Firestore failure');
          } catch (deleteError) {
            console.error('❌ Failed to delete auth user during rollback', deleteError);
          }
          
          setError(t('error.accountCreationFailed'));
          
          analytics.logEvent('signup_error', {
            errorCode: 'firestore_creation_failed',
            errorType: 'firestore_error'
          });
        }
      })
      .catch((error) => {
        console.error('❌ Auth account creation failed:', error);
        
        if (error.code === "auth/email-already-in-use") {
          setError(t('error.emailInUse'));
        } else {
          setError(t('error.general'));
        }
        
        analytics.logEvent('signup_error', {
          errorCode: error.code,
          errorType: error.code === "auth/email-already-in-use" ? 'email_in_use' : 'general'
        });
      });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <View>
          <TextInput
            style={styles.input}
            placeholder={t('placeholder.email')}
            keyboardType="email-address"
            textContentType="emailAddress"
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
          <TouchableOpacity style={styles.button} onPress={onHandleRegister}>
            <Text style={styles.buttonText}>{t('button.submit')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
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