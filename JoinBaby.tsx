import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { doc, getDocsFromServer, query, updateDoc, where, arrayUnion, getDocs } from 'firebase/firestore';
import { babiesRef, db, userRef } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYBOARD_CONFIG } from './utils/constants';

const ROLES = ['maman', 'papa', 'mamie', 'papy', 'nounou', 'tata', 'tonton', 'autre'] as const;
const AGE_RANGES = ['under25', 'r25to30', 'r30to35', 'r35to40', 'over40'] as const;

const ROLE_EMOJIS: Record<string, string> = {
  maman: '👩', papa: '👨', mamie: '👵', papy: '👴',
  nounou: '🍼', tata: '👩‍🦰', tonton: '🧔', autre: '✨',
};

const JoinBaby = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, setBabyID, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [step, setStep] = useState<'code' | 'profile'>('code');
  const [babyIDPaste, setBabyIDPaste] = useState('');
  const [babyName, setBabyName] = useState('');
  const [resolvedBabyDocId, setResolvedBabyDocId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('maman');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const ageAlreadySet = !!userInfo?.parentAgeRange;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userInfo?.parentAgeRange) {
      setSelectedAgeRange(userInfo.parentAgeRange);
    }
  }, [userInfo]);

  const onValidateCode = async () => {
    if (loading) return;
    const trimmedBabyID = babyIDPaste.trim();
    if (!trimmedBabyID) {
      setError(t('error.enterCode'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const queryResult = query(babiesRef, where('id', '==', trimmedBabyID));
      const querySnapshot = await getDocsFromServer(queryResult);

      if (querySnapshot.empty) {
        setError(t('error.invalidCode'));
        setLoading(false);
        return;
      }

      const babyDoc = querySnapshot.docs[0];
      setBabyName(babyDoc.data().name || '');
      setResolvedBabyDocId(babyDoc.id);
      setLoading(false);
      setStep('profile');
    } catch (error) {
      console.error('Error fetching baby:', error);
      setLoading(false);
      setError(t('error.updateFailed'));
    }
  };

  const onConfirmProfile = async () => {
    if (loading) return;

    if (!selectedAgeRange) {
      setError(t('error.ageRangeRequired') || 'Veuillez sélectionner votre tranche d\'âge');
      return;
    }

    setLoading(true);
    setError('');

    const trimmedBabyID = babyIDPaste.trim();

    try {
      await updateDoc(doc(db, 'Baby', resolvedBabyDocId), {
        user: arrayUnion(user.uid),
        [`memberRoles.${user.uid}`]: selectedRole,
      });

      setBabyID(trimmedBabyID);

      // Persist parentAgeRange on User if not already set
      if (!ageAlreadySet) {
        try {
          const userQuery = query(userRef, where('userId', '==', user.uid));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            await updateDoc(doc(db, 'Users', userSnap.docs[0].id), {
              parentAgeRange: selectedAgeRange,
            });
            setUserInfo({ ...userInfo, parentAgeRange: selectedAgeRange });
          }
        } catch {
          // Non-critical
        }
      }

      try {
        const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
        await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
        await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
        await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
        if (hasReviewed !== 'true') {
          await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
        }
      } catch {
        // Non-critical
      }

      try {
        analytics.logEvent('baby_joined', {
          baby_id: trimmedBabyID,
          baby_name: babyName,
          user_id: user.uid,
          parent_role: selectedRole,
          age_range: selectedAgeRange,
        });
      } catch {
        // Non-critical
      }

      setLoading(false);
      Alert.alert(t('congratsjoinbaby'));
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error joining baby:', error);
      setLoading(false);
      setError(t('error.updateFailed'));
    }
  };

  if (step === 'profile') {
    return (
      <KeyboardAvoidingView
        behavior={KEYBOARD_CONFIG.BEHAVIOR}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
      >
        <ScrollView contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled">
          {/* Confirmation */}
          <View style={styles.confirmationBanner}>
            <Text style={styles.confirmationText}>
              {t('baby.joiningBaby', { name: babyName })}
            </Text>
          </View>

          {/* Et vous ? */}
          <View style={styles.sectionHeader}>
            <View style={styles.questionBubble}>
              <Text style={styles.questionMark}>?</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>{t('baby.whoAreYou')}</Text>
              <Text style={styles.sectionSubtitle}>{t('baby.whoAreYouSubtitle')}</Text>
            </View>
          </View>

          {/* Rôle */}
          <Text style={styles.label}>{t('baby.yourRole')}</Text>
          <View style={styles.rolesGrid}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleCard, selectedRole === role && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role)}
                disabled={loading}
              >
                {selectedRole === role && (
                  <View style={styles.roleCheck}>
                    <Text style={styles.roleCheckText}>✓</Text>
                  </View>
                )}
                <Text style={styles.roleEmoji}>{ROLE_EMOJIS[role]}</Text>
                <Text style={[styles.roleLabel, selectedRole === role && styles.roleLabelSelected]}>
                  {t(`baby.roles.${role}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tranche d'âge */}
          {!ageAlreadySet && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>{t('baby.ageRange')}</Text>
              <View style={styles.ageRow}>
                {AGE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.ageChip, selectedAgeRange === range && styles.ageChipSelected]}
                    onPress={() => setSelectedAgeRange(range)}
                    disabled={loading}
                  >
                    <Text style={[styles.ageChipText, selectedAgeRange === range && styles.ageChipTextSelected]}>
                      {t(`baby.ageRanges.${range}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {userError !== '' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{userError}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onConfirmProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F6F0EB" />
            ) : (
              <Text style={styles.buttonText}>{t('baby.continueProfile')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

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
          onChangeText={setBabyIDPaste}
          accessibilityLabel={t('accessibility.enterCode')}
          accessibilityHint={t('accessibility.enterCodeHint')}
          returnKeyType="done"
          onSubmitEditing={onValidateCode}
          editable={!loading}
        />
        {userError ? <Text style={styles.errorText}>{userError}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onValidateCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F6F0EB" />
            ) : (
              <Text style={styles.buttonText}>{t('validate')}</Text>
            )}
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
  profileContent: {
    padding: 20,
    paddingBottom: 20,
  },
  confirmationBanner: {
    backgroundColor: '#C75B4A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  confirmationText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  questionBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#C75B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMark: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 10,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  roleCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  roleCardSelected: {
    backgroundColor: '#C75B4A',
  },
  roleCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCheckText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  roleEmoji: {
    fontSize: 26,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  roleLabelSelected: {
    color: '#FFF',
  },
  ageRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 3,
  },
  ageChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageChipSelected: {
    backgroundColor: '#C75B4A',
  },
  ageChipText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  ageChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: 'bold',
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
  footer: {
    backgroundColor: '#FDF1E7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 20, android: 10 }),
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 91, 74, 0.1)',
    alignItems: 'center',
  },
});
