import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useState } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';

const ChangeName = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [name, setName] = useState(userInfo.username);
  const [userError, setError] = useState('');
  console.log(user);

  const queryResult = query(userRef, where('userId', '==', user.uid));

  const onHandleModification = async () => {
    if (!name) {
      setError(t('enterValidName'));
      return;
    }
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        console.log(document);
        await updateDoc(doc(db, 'Users', document.id), {
          username: name,
        }).then(() => {
          setUserInfo({ ...userInfo, username: name });
          Alert.alert(t('nameChanged'));
        }
        );
      });
      
      navigation.goBack();
    } catch (error) {
      console.error('Error updating document:', error);
      setError(t('errorUpdatingName'));
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <TextInput
          style={styles.input}
          placeholder={t('name')}
          keyboardType="email-address"
          autoCapitalize="none"
          clearButtonMode="always"
          value={name}
          onChangeText={(text) => setName(text)}
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
          <TouchableOpacity style={styles.button} onPress={onHandleModification}>
          
          
        
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ChangeName;

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