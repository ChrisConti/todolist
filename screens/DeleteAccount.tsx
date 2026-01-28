import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDocs, query, where, arrayRemove, updateDoc, deleteDoc } from 'firebase/firestore';
import { babiesRef, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, deleteUser, signOut } from 'firebase/auth';
import { KEYBOARD_CONFIG } from '../utils/constants';

const DeleteAccount = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, setUser, babyID, setBabyID, setUserInfo } = useContext(AuthentificationUserContext);
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const deleteAccount = async () => {
    if (!password) {
      setError(t('enterValidPassword'));
      return;
    }

    setError(''); // Clear previous errors
    await handleAccountDeletion();
  };

  const handleAccountDeletion = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser || !user) {
      Alert.alert(t('error.title'), t('error.notAuthenticated'));
      return;
    }

    // Réauthentifier l'utilisateur
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error) {
      console.error('Reauthentication failed:', error);
      setError(t('incorrectPassword') || 'Incorrect password');
      return;
    }

    // Confirmation de suppression
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountMessage'),
      [
        {
          text: t('settings.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.confirm'),
          style: 'destructive',
          onPress: async () => {
            const userId = currentUser.uid;
            
            try {
              console.log('🗑️ Starting account deletion for user:', userId);
              
              // 1. Anonymiser les tâches dans tous les bébés
              const babiesWithUser = query(babiesRef, where('user', 'array-contains', userId));
              const babySnapshot = await getDocs(babiesWithUser);
              
              for (const babyDoc of babySnapshot.docs) {
                const babyData = babyDoc.data();
                const tasks = babyData.tasks || [];
                
                // Anonymiser les tâches créées par cet utilisateur
                const anonymizedTasks = tasks.map(task => {
                  if (task.user === userId) {
                    return {
                      ...task,
                      user: 'deleted_user',
                      createdBy: t('deletedUser') || 'Deleted User'
                    };
                  }
                  return task;
                });
                
                // Retirer l'userId de l'array user[] et mettre à jour les tâches
                await updateDoc(babyDoc.ref, {
                  user: arrayRemove(userId),
                  tasks: anonymizedTasks
                });
              }
              
              console.log('✅ Tasks anonymized in all babies');
              
              // 2. Supprimer le document User de Firestore
              const userQuery = query(userRef, where('userId', '==', userId));
              const userSnapshot = await getDocs(userQuery);
              
              const deleteUserPromises = userSnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deleteUserPromises);
              
              console.log('✅ User document deleted from Firestore');
              
              // 3. Nettoyer AsyncStorage (toutes les données utilisateur)
              await AsyncStorage.removeItem(`task_created_count_${userId}`);
              await AsyncStorage.removeItem(`has_reviewed_app_${userId}`);
              await AsyncStorage.removeItem(`last_review_prompt_at_count_${userId}`);
              await AsyncStorage.removeItem(`review_prompt_count_${userId}`);
              await AsyncStorage.removeItem('babyID'); // Important !
              
              // Anciennes clés globales pour compatibilité
              await AsyncStorage.removeItem('task_created_count');
              await AsyncStorage.removeItem('has_reviewed_app');
              await AsyncStorage.removeItem('last_review_prompt_at_count');
              await AsyncStorage.removeItem('has_prompted_for_review');
              
              console.log('✅ AsyncStorage cleaned');
              
              // 4. Supprimer le compte Firebase Auth
              await deleteUser(currentUser);
              console.log('✅ Firebase Auth user deleted');
              
              // 5. SignOut et reset Context
              await signOut(auth);
              setUser(null);
              setBabyID(null);
              setUserInfo(null);
              
              console.log('✅ User account fully deleted and anonymized');
              
              // 6. Navigation vers l'écran de connexion
              navigation.navigate('Connection');
              
            } catch (error) {
              console.error('❌ Error deleting account:', error);
              Alert.alert(
                t('error.title'),
                t('accountDeletionFailed') || 'Account deletion failed. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={KEYBOARD_CONFIG.BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.description}>
              {t('settings.deleteAccountWarning')}
            </Text>

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('password')}
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={(text) => setPassword(text)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.errorText}>{userError}</Text>
            <TouchableOpacity style={styles.button} onPress={deleteAccount}>
              <Text style={styles.buttonText}>{t('validate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default DeleteAccount;

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