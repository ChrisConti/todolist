import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { doc, getDocsFromServer, query, updateDoc, where, arrayUnion } from 'firebase/firestore';
import { babiesRef, db } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYBOARD_CONFIG } from './utils/constants';


const JoinBaby = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, setBabyID } = useContext(AuthentificationUserContext);
  const [babyIDPaste, setbabyIDPaste] = useState('');
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Log screen view when the component is mounted
  useEffect(() => {
    // Auto-focus on the input field
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const onHandleModification = async () => {
    if (loading) return;

    const trimmedBabyID = babyIDPaste.trim();
    if (!trimmedBabyID) {
      setError(t('error.enterCode'));
      return;
    }

    setLoading(true);
    setError('');

    const queryResult = query(babiesRef, where('id', '==', trimmedBabyID));
    try {
      const querySnapshot = await getDocsFromServer(queryResult);

      if (querySnapshot.empty) {
        setError(t('error.invalidCode'));
        setLoading(false);
        return;
      }

      // Use for...of to properly await all async operations before navigating
      for (const document of querySnapshot.docs) {
        const babyData = document.data();
        await updateDoc(doc(db, 'Baby', document.id), {
          user: arrayUnion(user.uid),
        });
        setBabyID(trimmedBabyID);

        // Clean review counters when joining a new baby
        try {
          const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
          await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
          await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
          await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
          if (hasReviewed !== 'true') {
            await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
          }
        } catch {
          // Non-critical — ignore storage errors
        }

        try {
          analytics.logEvent('baby_joined', {
            baby_id: trimmedBabyID,
            baby_name: babyData.name,
            baby_type: babyData.type,
            user_id: user.uid,
            timestamp: Date.now()
          });
        } catch {
          // Non-critical — don't fail the join if analytics throws
        }
      }

      setLoading(false);
      Alert.alert(t('congratsjoinbaby'));
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error updating document:', error);
      setLoading(false);
      setError(t('error.updateFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={KEYBOARD_CONFIG.BEHAVIOR}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={t('placeholder.code')}
          keyboardType="default"
          autoCapitalize="none"
          clearButtonMode="always"
          value={babyIDPaste}
          onChangeText={(text) => setbabyIDPaste(text)}
          accessibilityLabel={t('accessibility.enterCode')}
          accessibilityHint={t('accessibility.enterCodeHint')}
          returnKeyType="done"
          onSubmitEditing={onHandleModification}
          editable={!loading}
        />
        {userError ? <Text style={styles.errorText}>{userError}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onHandleModification}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  buttonDisabled: {
    opacity: 0.6,
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