import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { getAuth, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { KEYBOARD_CONFIG } from '../utils/constants';


const ChangeEmail = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [email, setEmail] = useState(userInfo.email || '');
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const updateAuthEmail = async () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      setError(t('userNotAuthenticated'));
      return;
    }
    await updateEmail(auth.currentUser, email);
  };

  const updateFirestoreEmail = async () => {
    const queryResult = query(userRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(queryResult);

    if (querySnapshot.empty) {
      setError(t('noUserFound'));
      return;
    }

    const updatePromises = querySnapshot.docs.map(async (document) => {
      await updateDoc(doc(db, 'Users', document.id), {
        email: email,
      });
    });

    await Promise.all(updatePromises);
  };

  async function updateUserEmail() {
    try {
      await updateAuthEmail();
      await updateFirestoreEmail();
      setUserInfo({ ...userInfo, email: email });
      Alert.alert(t('emailChanged'));

      // Log analytics event for successful email change


      navigation.goBack();
    } catch (error) {
      console.error('Error updating email:', error);
      setError(t('errorUpdatingEmail'));

      // Log analytics event for error

    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={KEYBOARD_CONFIG.BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.description}>
              {t('settings.changeEmailDescription')}
            </Text>

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('email')}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              clearButtonMode="always"
              value={email}
              onChangeText={(text) => setEmail(text)}
            />

            <TextInput
              style={styles.input}
              placeholder={t('password')}
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={(text) => setPassword(text)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.errorText}>{userError}</Text>
            <TouchableOpacity style={styles.button} onPress={updateUserEmail}>
              <Text style={styles.buttonText}>{t('validate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default ChangeEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'column',
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
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
});