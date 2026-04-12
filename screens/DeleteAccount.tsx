import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDocs, getDocsFromServer, query, where, updateDoc } from 'firebase/firestore';
import { babiesRef, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, deleteUser, signOut, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

const DeleteAccount = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, setUser, babyID, setBabyID, setUserInfo, userInfo } = useContext(AuthentificationUserContext);
  const [password, setPassword] = useState('');
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const provider = userInfo?.provider || 'email';

  useEffect(() => {
    if (provider === 'email') {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [provider]);

  const deleteAccount = async () => {
    if (loading) return;
    if (provider === 'email' && !password) {
      setError(t('enterValidPassword'));
      return;
    }

    setLoading(true);
    setError('');
    await handleAccountDeletion();
    setLoading(false);
  };

  const reauthenticateUser = async (currentUser: any) => {
    if (provider === 'email') {
      // Email/Password reauthentication
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } else if (provider === 'google') {
      // Google reauthentication
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await reauthenticateWithCredential(currentUser, googleCredential);
    } else if (provider === 'apple') {
      // Apple reauthentication
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }
      const appleProvider = new OAuthProvider('apple.com');
      const credential = appleProvider.credential({ idToken: identityToken });
      await reauthenticateWithCredential(currentUser, credential);
    }
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
      await reauthenticateUser(currentUser);
    } catch (error: any) {
      if (provider === 'email') {
        setError(t('incorrectPassword') || 'Incorrect password');
      } else {
        Alert.alert(
          t('error.title'),
          t('reauthenticationError', { message: provider === 'google' ? 'Google' : 'Apple' })
        );
      }
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

              // 1. Anonymiser les tâches dans tous les bébés
              const babiesWithUser = query(babiesRef, where('user', 'array-contains', userId));
              const babySnapshot = await getDocsFromServer(babiesWithUser);

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

                // NE PAS retirer l'userId de l'array user[], juste mettre à jour les tâches
                await updateDoc(babyDoc.ref, {
                  tasks: anonymizedTasks
                });
              }


              // 2. Anonymiser le document User (ne pas supprimer)
              const userQuery = query(userRef, where('userId', '==', userId));
              const userSnapshot = await getDocsFromServer(userQuery);

              const anonymizedEmail = `deleted_${Date.now()}_${userId.slice(0, 8)}@deleted.tribubaby.app`;

              const anonymizeUserPromises = userSnapshot.docs.map(doc =>
                updateDoc(doc.ref, {
                  email: anonymizedEmail,
                  username: t('deletedUser') || 'Utilisateur supprimé',
                  deleted: true,
                  deletedAt: new Date().toISOString()
                })
              );
              await Promise.all(anonymizeUserPromises);

              
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
              
              
              // 4. Supprimer le compte Firebase Auth
              await deleteUser(currentUser);
              
              // 5. SignOut et reset Context
              // Note: no explicit navigation.navigate() needed here —
              // deleteUser() triggers onAuthStateChanged(null) in App.tsx,
              // which sets user=null and automatically renders AuthStack (Connection).
              await signOut(auth);
              setUser(null);
              setBabyID(null);
              setUserInfo(null);
              
            } catch (error) {
              console.error('Error deleting account:', error);
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
      style={{ flex: 1, backgroundColor: '#FDF1E7' }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
      >
        <Text style={styles.description}>
          {t('settings.deleteAccountWarning')}
        </Text>

        {provider === 'email' ? (
          <>
            <Text style={styles.instruction}>
              {t('settings.deleteAccountPasswordInstruction')}
            </Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('password')}
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              textContentType="password"
              autoComplete="current-password"
              value={password}
              onChangeText={(text) => setPassword(text)}
            />
          </>
        ) : (
          <Text style={styles.instruction}>
            {t('settings.deleteAccountReauthInstruction', { provider: provider === 'google' ? 'Google' : 'Apple' })}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.errorText}>{userError}</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={deleteAccount}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{t('validate')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default DeleteAccount;

const styles = StyleSheet.create({
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
    backgroundColor: '#FDF1E7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({
      ios: 20,
      android: 10,
    }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 91, 74, 0.1)',
    alignItems: 'center',
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