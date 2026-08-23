import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth, db } from './config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import analytics from './services/analytics';
import * as Localization from 'expo-localization';
import { KEYBOARD_CONFIG } from './utils/constants';
import i18n from './i18n';

const SignIn = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'throwam.com',
  'tempmail.com', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info', 'spam4.me',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'dispostable.com',
  'mailnull.com', 'maildrop.cc', 'spamgourmet.com', 'mytemp.email',
  'discard.email', 'spamfree24.org', 'mailnesia.com', 'mailnull.com',
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const validateEmail = (value: string): string => {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return t('error.invalidEmail');
  if (!EMAIL_REGEX.test(normalized)) return t('error.invalidEmail');
  const domain = normalized.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) return t('error.disposableEmail');
  return '';
};

  useEffect(() => {
    const timer = setTimeout(() => emailInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const onHandleRegister = async () => {
    if (loading) return;

    const normalizedEmail = email.toLowerCase().trim();
    const emailValidation = validateEmail(normalizedEmail);
    if (emailValidation) {
      setEmailError(emailValidation);
      setEmailTouched(true);
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
      const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      try {
        // Récupérer le pays de l'utilisateur
        const userCountry = Localization.getLocales()[0]?.regionCode || 'Unknown';

        // Vérifier si un document User existe déjà pour cet userId
        const userQuery = query(
          collection(db, "Users"),
          where('userId', '==', res.user.uid)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          // Document User existe déjà - situation anormale, rollback
          try {
            await res.user.delete();
          } catch (deleteError) {
            console.error('CRITICAL: Failed to delete auth user during rollback', deleteError);
          }

          setError(t('error.userDocumentExists') || 'An account already exists. Please try logging in.');
          setLoading(false);
          return;
        } else {
          // CRITIQUE : Créer le document User dans Firestore
          await addDoc(collection(db, "Users"), {
            userId: res.user.uid,
            email: normalizedEmail,
            username: trimmedName,
            babyID: '',
            country: userCountry,
            language: i18n.language,
            provider: 'email',
            emailOptIn,
            isPremium: false,
            creationDate: serverTimestamp(),
            platform: Platform.OS,
          });
        }

        analytics.logEvent('user_signup', {
          user_id: res.user.uid,
          method: 'email',
          country: userCountry
        });
        analytics.setUserProperty('auth_provider', 'email');
        
        setLoading(false);
        
        // onAuthStateChanged dans App.tsx va gérer la navigation automatique
        
      } catch (firestoreError: any) {
        // Firestore failed — rollback the Auth user
        if (firestoreError.message && firestoreError.message.includes('Document already exists')) {
          setError(t('error.userDocumentExists') || 'An account already exists. Please try logging in.');
          setLoading(false);
          return;
        }

        try {
          await res.user.delete();
        } catch (deleteError) {
          console.error('CRITICAL: Failed to delete auth user during rollback', deleteError);
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
      setLoading(false);
      
      if (error.code === "auth/email-already-in-use") {
        setError(t('error.emailAlreadyRegistered') || 'This email is already registered');
      } else if (error.code === "auth/network-request-failed") {
        setError(t('error.networkError') || 'Network error. Check your connection.');
      } else if (error.code === "auth/invalid-email") {
        setError(t('error.invalidEmail'));
      } else {
        setError(t('error.general'));
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
      behavior={KEYBOARD_CONFIG.BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
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
                style={[
                  styles.input,
                  emailTouched && emailError ? styles.inputError : null,
                  emailTouched && !emailError && email ? styles.inputValid : null,
                ]}
                placeholder={t('placeholder.email')}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailTouched) {
                    setEmailError(validateEmail(text.toLowerCase().trim()));
                  }
                }}
                onBlur={() => {
                  setEmailTouched(true);
                  setEmailError(validateEmail(email.toLowerCase().trim()));
                }}
                editable={!loading}
              />
              {emailTouched && emailError ? (
                <Text style={styles.inlineError}>{emailError}</Text>
              ) : null}
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

              <TouchableOpacity
                style={styles.emailOptInRow}
                onPress={() => setEmailOptIn(v => !v)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Switch
                  value={emailOptIn}
                  onValueChange={setEmailOptIn}
                  thumbColor={emailOptIn ? '#C75B4A' : '#ccc'}
                  trackColor={{ false: '#E0E0E0', true: '#F0C4BB' }}
                  disabled={loading}
                />
                <Text style={styles.emailOptInText}>{t('conditions.emailOptIn')}</Text>
              </TouchableOpacity>

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
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#E53935',
    borderWidth: 2,
  },
  inputValid: {
    borderColor: '#43A047',
  },
  inlineError: {
    color: '#E53935',
    fontSize: 12,
    marginBottom: 11,
    paddingHorizontal: 4,
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
  emailOptInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  emailOptInText: {
    flex: 1,
    fontSize: 13,
    color: '#7A8889',
    lineHeight: 18,
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