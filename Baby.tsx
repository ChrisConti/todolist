import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { db } from './config';
import { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { userRef } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import { validateBabyName, validateBirthdate, formatBirthdateInput } from './utils/validation';
import { COLLECTIONS, KEYBOARD_CONFIG } from './utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseReviewPromptState } from './utils/reviewPromptLogic';

const ROLES = ['maman', 'papa', 'mamie', 'papy', 'nounou', 'tata', 'tonton', 'autre'] as const;
const AGE_RANGES = ['under25', 'r25to30', 'r30to35', 'r35to40', 'over40'] as const;

const ROLE_EMOJIS: Record<string, string> = {
  maman: '👩',
  papa: '👨',
  mamie: '👵',
  papy: '👴',
  nounou: '🍼',
  tata: '👩‍🦰',
  tonton: '🧔',
  autre: '✨',
};

const Baby = ({ navigation }) => {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState(0);
  const [birthdate, setBirthdate] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('maman');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const { user, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();

  const types = [
    { id: 0, type: 'Boy' },
    { id: 1, type: 'Girl' },
  ];

  const ageAlreadySet = !!userInfo?.parentAgeRange;

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => nameInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userInfo?.parentAgeRange) setSelectedAgeRange(userInfo.parentAgeRange);
  }, [userInfo]);

  const handleCreateBaby = async () => {
    if (loading) return;

    const trimmedName = name.trim();
    const nameValidation = validateBabyName(trimmedName, t);
    if (!nameValidation.isValid) { setError(nameValidation.error || t('error.name')); return; }

    const birthdateValidation = validateBirthdate(birthdate, t);
    if (!birthdateValidation.isValid) { setError(birthdateValidation.error || t('error.birthdate')); return; }

    if (!selectedAgeRange) { setError(t('error.ageRangeRequired') || 'Veuillez sélectionner votre tranche d\'âge'); return; }

    if (!user?.uid) { setError(t('error.notAuthenticated')); return; }

    setLoading(true);
    setError('');

    try {
      const CHARS = 'BCDFGHJKMNPQRSTVWXYZ23456789';
      const uniqueId = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
      await addDoc(collection(db, COLLECTIONS.BABY), {
        id: uniqueId,
        type: types[selectedType].type,
        name: trimmedName,
        birthDate: birthdate,
        createdDate: serverTimestamp(),
        user: [user.uid],
        admin: user.uid,
        userName: userInfo?.username || 'Unknown',
        userEmail: userInfo?.email || '',
        tasks: [],
        memberRoles: { [user.uid]: selectedRole },
        memberJoinDates: { [user.uid]: serverTimestamp() },
      });
      setBabyID(uniqueId);

      if (!ageAlreadySet) {
        try {
          const userQuery = query(userRef, where('userId', '==', user.uid));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            await updateDoc(doc(db, 'Users', userSnap.docs[0].id), { parentAgeRange: selectedAgeRange });
          }
        } catch { /* Non-critical */ }
      }

      try {
        await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
        await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
        await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
        const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
        if (hasReviewed !== 'true') await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
        // Nouveau système : réancre le compteur de tâches sans effacer la mémoire oui/non
        const promptState = parseReviewPromptState(await AsyncStorage.getItem(`review_prompt_state_${user.uid}`));
        if (promptState) {
          await AsyncStorage.setItem(
            `review_prompt_state_${user.uid}`,
            JSON.stringify({ ...promptState, lastPromptAtCount: 0 })
          );
        }
      } catch { /* Non-critical */ }

      try {
        analytics.logEvent('baby_created', {
          baby_type: types[selectedType].type,
          baby_id: uniqueId,
          user_id: user.uid,
          parent_role: selectedRole,
          age_range: selectedAgeRange,
        });
      } catch { /* Non-critical */ }

      setLoading(false);
      navigation.navigate('FirstBiberon', { babyID: uniqueId, babyName: trimmedName });
    } catch (error: any) {
      setLoading(false);
      if (error.code === 'permission-denied') setError(t('error.permissionDenied') || 'Permission denied');
      else if (error.code === 'unavailable') setError(t('error.networkError') || 'Network error.');
      else setError(t('error.babyCreationFailed') || 'Unable to create baby. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FDF1E7' }}
      behavior={KEYBOARD_CONFIG.BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
    >
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* ── Sexe ── */}
        <Text style={styles.label}>{t('baby.sex')}</Text>
        <View style={styles.sexRow}>
          {[0, 1].map((i) => (
            <TouchableOpacity
              key={i}
              style={[styles.sexCard, selectedType === i && styles.sexCardSelected]}
              onPress={() => setSelectedType(i)}
              disabled={loading}
            >
              {selectedType === i && (
                <View style={styles.sexCheck}>
                  <Text style={styles.sexCheckText}>✓</Text>
                </View>
              )}
              {i === 0 ? <Boy width={44} height={44} /> : <Girl width={44} height={44} />}
              <Text style={styles.sexLabel}>{i === 0 ? t('baby.boy') : t('baby.girl')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Nom ── */}
        <Text style={styles.label}>{t('baby.name')}</Text>
        <TextInput
          ref={nameInputRef}
          style={styles.input}
          placeholder={t('placeholder.firstName')}
          placeholderTextColor="#BBA899"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        {/* ── Date ── */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t('baby.birthdate')}</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={(t) => setBirthdate(formatBirthdateInput(t))}
          keyboardType="numeric"
          placeholder={t('placeholder.birthdate')}
          placeholderTextColor="#BBA899"
          maxLength={10}
          editable={!loading}
        />

        {/* ── Séparateur ── */}
        <View style={styles.divider} />

        {/* ── Et vous ? ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.questionBubble}>
            <Text style={styles.questionMark}>?</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>{t('baby.whoAreYou')}</Text>
            <Text style={styles.sectionSubtitle}>{t('baby.whoAreYouSubtitle')}</Text>
          </View>
        </View>

        {/* ── Rôle ── */}
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

        {/* ── Tranche d'âge ── */}
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

        {/* ── Erreur ── */}
        {userError !== '' && (
          <Text style={styles.error}>{userError}</Text>
        )}

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleCreateBaby}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.ctaText}>{t('button.validate')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ── Labels ── */
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 10,
  },

  /* ── Sexe ── */
  sexRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sexCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  sexCardSelected: {
    borderColor: '#C75B4A',
  },
  sexCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C75B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexCheckText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sexLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },

  /* ── Inputs ── */
  input: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#222',
  },

  /* ── Divider ── */
  divider: {
    height: 1,
    backgroundColor: '#E0CFC0',
    marginVertical: 28,
  },

  /* ── Et vous? ── */
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

  /* ── Roles ── */
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

  /* ── Tranche d'âge ── */
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

  /* ── Erreur ── */
  error: {
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },

  /* ── CTA ── */
  cta: {
    marginTop: 28,
    backgroundColor: '#C75B4A',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default Baby;
