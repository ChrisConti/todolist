import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';

const ChangeName = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [name, setName] = useState(userInfo?.username || '');
  const [userError, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const queryResult = query(userRef, where('userId', '==', user.uid));

  // Log screen view when the component is mounted
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const onHandleModification = async () => {
    if (!name) {
      setError(t('enterValidName'));
      return;
    }
    try {
      const querySnapshot = await getDocs(queryResult);
      if (querySnapshot.empty) {
        setError(t('noUserFound'));
        return;
      }

      for (const document of querySnapshot.docs) {
        await updateDoc(doc(db, 'Users', document.id), {
          username: name,
        });
      }

      setUserInfo({ ...userInfo, username: name });
      Alert.alert(t('nameChanged'));

      // Log analytics event for successful name change


      navigation.goBack();
    } catch (error) {
      console.error('Error updating document:', error);
      setError(t('errorUpdatingName'));

      // Log analytics event for error

    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.description}>
              {t('settings.changeNameDescription')}
            </Text>

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('name')}
              keyboardType="default"
              autoCapitalize="words"
              clearButtonMode="always"
              value={name}
              onChangeText={(text) => setName(text)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.errorText}>{userError}</Text>
            <TouchableOpacity style={styles.button} onPress={onHandleModification}>
              <Text style={styles.buttonText}>{t('validate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default ChangeName;

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