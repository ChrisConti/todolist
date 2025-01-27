import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './config';
import { useTranslation } from 'react-i18next';
import { AuthentificationUserContext } from './Context/AuthentificationContext';

const PasswordForgotten = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useContext(AuthentificationUserContext);
  const [email, setEmail] = useState('');
  const [userError, setError] = useState('');

  function onHandleForgetPassword() {
    const emailRegex = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidEmail = emailRegex.test(email);

    if (!email || !isValidEmail) {
      setError(t('enterValidEmail'));
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log('success');
        navigation.navigate('Connection');
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(errorCode, errorMessage);
        navigation.navigate('Connection');
      });
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <Text>
          {t('settings.resetPasswordInstructions')}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          clearButtonMode='always'
          value={email}
          onChangeText={(text) => setEmail(text)}
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
          <View>
            <Text style={styles.errorText}>{userError}</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={onHandleForgetPassword}>
            <Text style={styles.buttonText}>{t('settings.sendEmail')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default PasswordForgotten;

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
    color: '#F6F0EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
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
  },
});