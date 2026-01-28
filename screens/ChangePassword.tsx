import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { getAuth, sendPasswordResetEmail, updateEmail, updatePassword } from "firebase/auth";
import { auth } from '../config.js';
import { useTranslation } from 'react-i18next';

const ChangeEmail = ({route, navigation}) => {
  const { t } = useTranslation();
  const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

  function onHandleForgetPassword() {
    sendPasswordResetEmail(auth, user.email)
  .then(() => {
    console.log('success');
    Alert.alert(t('settings.resetPassordEmailSent'));
    navigation.goBack();
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
  });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.description}>
            {t('settings.resetPasswordInstructions')}
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={onHandleForgetPassword}>
            <Text style={styles.buttonText}>{t('settings.sendEmail')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

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
});
