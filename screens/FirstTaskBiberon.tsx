import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { babiesRef, db } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useReviewPrompt } from '../Context/ReviewPromptContext';
import analytics from '../services/analytics';
import Biberon from '../assets/biberon-color.svg';

// Écran d'onboarding post-création bébé : saisie antidatée du dernier biberon en 2 taps.
// 86% des premières tâches arrivent dans l'heure suivant la création du bébé — cet écran
// provoque ce geste ; « Passer » renvoie vers le Home qui affiche la grille première tâche.

const TIME_OPTIONS = [
  { key: 'now', minutes: 0 },
  { key: 'ago30m', minutes: 30 },
  { key: 'ago1h', minutes: 60 },
  { key: 'ago2h', minutes: 120 },
  { key: 'ago3h', minutes: 180 },
];

const ML_CHIPS = [60, 90, 120, 150];

const MILK_TYPES = [
  { value: 'artificial', emoji: '🥛', labelKey: 'milkType.artificial' },
  { value: 'maternal', emoji: '🤱', labelKey: 'milkType.maternal' },
];

const FirstTaskBiberon = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, userInfo, babyID: contextBabyID } = useContext(AuthentificationUserContext);
  const { handleTaskCreated } = useReviewPrompt();

  const babyID = route.params?.babyID ?? contextBabyID;
  const babyName = route.params?.babyName ?? '';

  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [selectedMl, setSelectedMl] = useState<string>('');
  const [milkType, setMilkType] = useState<string>('artificial');
  const [loading, setLoading] = useState(false);

  const goHome = () => navigation.navigate('MainTabs');

  const handleSkip = () => {
    analytics.logEvent('first_task_skipped', { baby_id: babyID });
    goHome();
  };

  const handleSave = async () => {
    if (loading || selectedMinutes === null || !user?.uid || !babyID) return;
    setLoading(true);

    try {
      const babyQuery = query(babiesRef, where('id', '==', babyID));
      const querySnapshot = await getDocs(babyQuery);
      if (querySnapshot.empty) {
        setLoading(false);
        Alert.alert(t('error.title'), t('error.babyNotFound') || 'Baby not found');
        return;
      }
      const document = querySnapshot.docs[0];

      const taskDate = moment().subtract(selectedMinutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
      const newTask = {
        uid: uuid.v4(),
        id: 0,
        labelTask: 'biberon',
        date: taskDate,
        label: selectedMl ? selectedMl : 0,
        boobLeft: 0,
        boobRight: 0,
        breastfeedingMode: null,
        milkType,
        sleepType: null,
        sleepLocation: null,
        user: user.uid,
        createdBy: userInfo?.username || 'Unknown',
        comment: '',
      };

      await updateDoc(doc(db, 'Baby', document.id), {
        tasks: [...(document.data().tasks || []), newTask],
      });

      const { updateBiberonWidget } = require('../utils/widgetBridge');
      updateBiberonWidget(Number(selectedMl) || 0, milkType, new Date(taskDate));

      analytics.logEvent('task_created', {
        task_type: 'biberon',
        task_id: 0,
        has_label: !!selectedMl,
        has_note: false,
        user_id: user.uid,
        milk_type: milkType,
        onboarding: true,
      });
      analytics.logEvent('first_task_saved', {
        baby_id: babyID,
        minutes_ago: selectedMinutes,
        has_quantity: !!selectedMl,
      });

      await handleTaskCreated();

      setLoading(false);
      goHome();
    } catch (error) {
      console.error('Error saving first task:', error);
      setLoading(false);
      Alert.alert(t('error.title'), t('error.networkError') || 'Network error.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.iconBadge}>
          <Biberon height={44} width={44} />
        </View>

        <Text style={styles.babyName}>{babyName}</Text>
        <Text style={styles.title}>{t('firstTask.title')}</Text>
        <Text style={styles.subtitle}>{t('firstTask.subtitle')}</Text>

        <View style={styles.chipsWrap}>
          {TIME_OPTIONS.map(({ key, minutes }) => {
            const isSelected = selectedMinutes === minutes;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedMinutes(isSelected ? null : minutes)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {t(`firstTask.${key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.quantityLabel}>{t('milkType.title')}</Text>
        <View style={styles.chipsWrap}>
          {MILK_TYPES.map(({ value, emoji, labelKey }) => {
            const isSelected = milkType === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setMilkType(value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {emoji} {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.quantityLabel}>{t('firstTask.quantityOptional')}</Text>
        <View style={styles.chipsWrap}>
          {ML_CHIPS.map((ml) => {
            const isSelected = selectedMl === String(ml);
            return (
              <TouchableOpacity
                key={ml}
                onPress={() => setSelectedMl(isSelected ? '' : String(ml))}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{ml}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveButton, selectedMinutes === null && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={selectedMinutes === null || loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.saveButtonText}>{t('firstTask.save')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipButtonText}>{t('firstTask.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF1E7' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  iconBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  babyName: {
    fontFamily: 'Pacifico',
    fontSize: 32,
    color: '#C75B4A',
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: '#5A5A5A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A8889',
    textAlign: 'center',
    marginBottom: 32,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: '#C75B4A',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  chipTextSelected: {
    color: '#FFF',
  },
  quantityLabel: {
    fontSize: 13,
    color: '#7A8889',
    marginTop: 28,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 24,
  },
  saveButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    borderWidth: 1.5,
    borderColor: '#C75B4A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#C75B4A',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FirstTaskBiberon;
