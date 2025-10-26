import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useState } from 'react';
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <TextInput
          style={styles.input}
          placeholder={t('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          clearButtonMode="always"
          value={email}
          onChangeText={(text) => setEmail(text)}
        />
        <TextInput
          style={styles.input}
          placeholder={t('password')}
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
        />

        <View
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexDirection: 'column',
          }}
        >
          <Text style={styles.errorText}>{userError}</Text>
          <TouchableOpacity style={styles.button} onPress={updateUserEmail}>
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ChangeEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#FDF1E7',
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
});