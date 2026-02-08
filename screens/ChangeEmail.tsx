import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { getAuth, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';


const ChangeEmail = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [email, setEmail] = useState(userInfo.email || '');
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const isReadOnly = userInfo?.provider !== 'email';

  useEffect(() => {
    if (!isReadOnly) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isReadOnly]);

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
      style={{ flex: 1, backgroundColor: '#FDF1E7' }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
      >
        <Text style={styles.description}>
          {isReadOnly
            ? t('settings.changeEmailReadOnly', { provider: userInfo?.provider === 'google' ? 'Google' : 'Apple' })
            : t('settings.changeEmailDescription')
          }
        </Text>

        <TextInput
          ref={inputRef}
          style={[styles.input, isReadOnly && styles.inputReadOnly]}
          placeholder={t('email')}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          clearButtonMode="always"
          value={email}
          onChangeText={(text) => setEmail(text)}
          editable={!isReadOnly}
        />

        {!isReadOnly && (
          <TextInput
            style={styles.input}
            placeholder={t('password')}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
            textContentType="password"
            autoComplete="current-password"
            value={password}
            onChangeText={(text) => setPassword(text)}
          />
        )}
      </ScrollView>

      {!isReadOnly && (
        <View style={styles.footer}>
          <Text style={styles.errorText}>{userError}</Text>
          <TouchableOpacity style={styles.button} onPress={updateUserEmail}>
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default ChangeEmail;

const styles = StyleSheet.create({
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
  inputReadOnly: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
    color: '#666',
  },
  footer: {
    backgroundColor: '#FDF1E7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({
      ios: 20,
      android: 10,
    }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 91, 74, 0.1)',
    alignItems: 'center',
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