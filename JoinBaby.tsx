import { View, Text, TouchableOpacity, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import React, { useContext, useState, useEffect } from 'react';
import { doc, getDocs, query, updateDoc, where, arrayUnion } from 'firebase/firestore';
import { babiesRef, db } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';


const JoinBaby = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, setBabyID } = useContext(AuthentificationUserContext);
  const [babyIDPaste, setbabyIDPaste] = useState('');
  const [userError, setError] = useState('');

  // Log screen view when the component is mounted
  useEffect(() => {
    analytics.logScreenView('JoinBaby');
  }, []);

  const onHandleModification = async () => {
    const trimmedBabyID = babyIDPaste.trim();
    if (!trimmedBabyID) {
      setError(t('error.enterCode'));
      analytics.logEvent('baby_join_error', {
        errorType: 'empty_code',
        userId: user.uid
      });
      return;
    }

    const queryResult = query(babiesRef, where('id', '==', trimmedBabyID));
    try {
      const querySnapshot = await getDocs(queryResult);

      if (querySnapshot.empty) {
        setError(t('error.invalidCode'));
        analytics.logEvent('baby_join_error', {
          errorType: 'invalid_code',
          userId: user.uid
        });
        return;
      }

      querySnapshot.forEach(async (document) => {
        const babyData = document.data();
        await updateDoc(doc(db, 'Baby', document.id), {
          user: arrayUnion(user.uid),
        });
        console.log('success');
        setBabyID(trimmedBabyID);

        // Clean review counters when joining a new baby
        // But keep has_reviewed_app if user already reviewed
        try {
          const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
          await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
          await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
          await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
          // Only remove has_reviewed if user hasn't reviewed yet
          if (hasReviewed !== 'true') {
            await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
          }
          console.log('✅ Review counters cleaned when joining baby:', trimmedBabyID, 'preserved has_reviewed:', hasReviewed === 'true');
        } catch (storageError) {
          console.warn('⚠️ Failed to clean review counters:', storageError);
        }

        analytics.logEvent('baby_joined', {
          babyId: trimmedBabyID,
          babyName: babyData.name,
          babyType: babyData.type,
          userId: user.uid,
          timestamp: Date.now()
        });
      });

      Alert.alert(t('congratsjoinbaby'));
      navigation.navigate('BabyList');
    } catch (error) {
      console.error('Error updating document:', error);
      setError(t('error.updateFailed'));

      analytics.logEvent('baby_join_error', {
        errorType: 'update_failed',
        userId: user.uid,
        error: error.message
      });
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.code')}
          keyboardType="email-address"
          autoCapitalize="none"
          clearButtonMode="always"
          value={babyIDPaste}
          onChangeText={(text) => setbabyIDPaste(text)}
          accessibilityLabel={t('accessibility.enterCode')}
          accessibilityHint={t('accessibility.enterCodeHint')}
        />
        {userError ? <Text style={styles.errorText}>{userError}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={onHandleModification}>
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default JoinBaby;

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
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
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
});