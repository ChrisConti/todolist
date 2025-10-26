import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useState } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { getAuth, updateEmail, reauthenticateWithCredential, EmailAuthProvider, deleteUser, signOut } from 'firebase/auth';

const DeleteAccount = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, setUser, babyID, setBabyID, setUserInfo } = useContext(AuthentificationUserContext);
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  console.log(user);

  function updateUserEmail() { 


    if (!password) {
      setError(t('enterValidPassword'));
      return;
    }

      onHandleModification();

  }

  const onHandleModification = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, password);

    await reauthenticateWithCredential(user, credential);

    Alert.alert(
        t('settings.deleteAccountTitle'),
        t('settings.deleteAccountMessage'),
        [
          {
            text: t('settings.cancel'),
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {
            text: t('settings.confirm'),
            onPress: () => {
              deleteUser(auth.currentUser)
                .then(() => {
                  console.log('User deleted');
                  signOut(auth)
                    .then(() => {
                      setUser(null);
                      setBabyID(null);
                      setUserInfo(null);
                     // navigation.navigate('Connection');
                    })
                    .catch((error) => {
                      Alert.alert(error.message);
                    });
                })
                .catch((error) => {
                  console.log(error);
                });
            },
          },
        ],
      );


  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <Text>
            {t('settings.deleteAccount')}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('password')}
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
        />

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
          <Text style={styles.errorText}>{userError}</Text>
          <TouchableOpacity style={styles.button} onPress={updateUserEmail}>
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default DeleteAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 10, backgroundColor: '#FDF1E7'
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 250
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