import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet, Alert } from 'react-native';
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
    <View style={{flex:1, padding:10, backgroundColor:'#FDF1E7'}}>
      <Text>
        {t('settings.resetPasswordInstructions')}
      </Text>

      <View style={{
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection:'column',
      }}>
        <TouchableOpacity style={styles.button} onPress={onHandleForgetPassword}>
          <Text style={styles.buttonText}>{t('settings.sendEmail')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default ChangeEmail;

const styles = StyleSheet.create({
  container: {
    flex:1, padding:10, backgroundColor:'#FDF1E7'
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width:250
  },
  buttonText: {
    color: '#F6F0EB',
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
    backgroundColor: 'white',
  },
});
