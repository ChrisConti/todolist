import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, ScrollView, TouchableWithoutFeedback, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { db, babiesRef } from '../config.js';
import { doc, getDocsFromServer, query, updateDoc, where } from 'firebase/firestore';
import { useReviewPrompt } from '../Context/ReviewPromptContext';
import moment from 'moment';

import DateTimePicker from "react-native-modal-datetime-picker";

import uuid from 'react-native-uuid';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Allaitement from '../assets/allaitement-color.svg';
import Thermo from '../assets/thermo-color.svg';
import Dodo from '../assets/dodo-color.svg';
import Couche from '../assets/couche-color.svg';
import Sante from '../assets/sante-color.svg';
import Biberon from '../assets/biberon-color.svg';
import analytics from '../services/analytics';
import { KEYBOARD_CONFIG } from '../utils/constants';
import BreastfeedingSection, { BreastfeedingRef } from '../components/BreastfeedingSection';


const IMAGES = [
  { id: 0, rq: require('../assets/biberon.png') },
  { id: 5, rq: require('../assets/allaitement.png') },
  { id: 3, rq: require('../assets/sommeil.png') },
  { id: 1, rq: require('../assets/diaper.png') },
  { id: 4, rq: require('../assets/thermo.png') },
  { id: 2, rq: require('../assets/medicaments.png') },
];

interface CreateTaskProps {
  route: any;
  navigation: any;
}
const CreateTask: React.FC<CreateTaskProps> = ({ route, navigation }) => {
  const { handleTaskCreated } = useReviewPrompt();
  const { t } = useTranslation();
  const task = undefined;
  //const { babyID } = route.params;
  
  const { user, setUser, babyID, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);
  const [selectedImage, setSelectedImage] = useState(route.params?.initialCategory ?? (task ? task.id : 0));
  const categoryEnterTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (route.params?.initialCategory != null) {
      setSelectedImage(route.params.initialCategory);
    }
  }, [route.params?.initialCategory]);
  const [time, setTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [milkType, setMilkType] = useState<string>('artificial');
  const [diaperContent, setDiaperContent] = useState<number | null>(null); // 0=pee, 1=poop, 2=both
  const [diaperType, setDiaperType] = useState<number | null>(null); // 0=normal, 1=soft, 2=liquid
  const [sleepType, setSleepType] = useState<string>('nap');
  const [sleepLocation, setSleepLocation] = useState<string | null>(null); // bed, arms, breastfeeding, bottle, bouncer, other
  const [sleepHours, setSleepHours] = useState<string>('');
  const [sleepMinutes, setSleepMinutes] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const uniqueId = useRef(uuid.v4()).current;
  const breastfeedingRef = useRef<BreastfeedingRef>(null);
  const [temperatureDuration, setTemperatureDuration] = useState<string>('');
  const [labelSource, setLabelSource] = useState<'chip' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);
  const [isDateManuallySet, setIsDateManuallySet] = useState(false);
  const [bfMode, setBfMode] = useState<'timer' | 'manual'>('timer');
  const [bfStartTime, setBfStartTime] = useState<number | null>(null);
  const bfLockedRef = useRef(false);
  // La date est verrouillée dès qu'une mesure existe : le chrono fait foi, le picker devient inaccessible
  const isDateLocked = selectedImage === 5 && bfMode === 'timer' && bfStartTime !== null;


  // date picker
  const showDateTimePicker = () => {
    setIsDateTimePickerVisible(true);
  };

  const handleImageType = (id: number) => {
    if (id == 0) return <Biberon height={45} width={45} />;
    if (id == 1) return <Couche height={35} width={35} />;
    if (id == 2) return <Sante height={35} width={35} />;
    if (id == 3) return <Dodo height={35} width={35} />;
    if (id == 4) return <Thermo height={35} width={35} />;
    if (id == 5) return <Allaitement height={35} width={35} />;
  };

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad:'dur' },
    { id: 1, name: t('diapers.mou'), nameTrad:'mou' },
    { id: 2, name: t('diapers.liquide'), nameTrad:'liquide' },
  ];
  const returnLabel = (id: number) => {
    if (id == 0) return 'biberon';
    if (id == 1) return 'couche';
    if (id == 2) return 'Sante';
    if (id == 3) return 'sommeil';
    if (id == 4) return 'thermo';
    if (id == 5) return 'allaitement';

    return 
  }

  const updateBabyTasks = async () => {
    if (loading) return; // Prévenir double-soumission

    // Sleep: block save if values exceed limits
    if (selectedImage === 3) {
      if (sleepHours && parseInt(sleepHours) > 24) {
        Alert.alert(t('error.title'), t('placeholder.sleepHoursMax'));
        return;
      }
      if (sleepMinutes && parseInt(sleepMinutes) > 180) {
        Alert.alert(t('error.title'), t('placeholder.sleepMinutesMax'));
        return;
      }
    }

    if (!user || !user.uid) {
      console.error('Cannot update tasks: user not authenticated');
      Alert.alert(t('error.title'), t('error.notAuthenticated'));
      return;
    }

    setLoading(true);

    const queryResult = query(babiesRef, where('id', '==', babySelected));
    try {
      const querySnapshot = await getDocsFromServer(queryResult);

      if (querySnapshot.empty) {
        console.error('No baby found with this ID');
        setLoading(false);
        Alert.alert(t('error.title'), t('error.babyNotFound') || 'Baby not found');
        return;
      }
      
      // Ne prendre que le premier document trouvé
      const document = querySnapshot.docs[0];
      
      const bfValues = breastfeedingRef.current?.getValues();
      const taskDate =
        selectedImage === 5 &&
        bfValues?.mode === 'timer' &&
        bfValues.timerStartTime &&
        !isDateManuallySet
          ? moment(bfValues.timerStartTime).format('YYYY-MM-DD HH:mm:ss')
          : time;
      const newTask = {
        uid: uniqueId,
        id: selectedImage,
        labelTask: returnLabel(selectedImage),
        date: taskDate,
        label: selectedImage === 3
          ? ((sleepHours || sleepMinutes) ? String(parseInt(sleepHours || '0') * 60 + parseInt(sleepMinutes || '0')) : 0)
          : (label ? label : 0),
        // Only include diaperType and diaperContent for diaper tasks (id === 1)
        ...(selectedImage === 1 && diaperType !== null && { diaperType }),
        ...(selectedImage === 1 && diaperType !== null && { idCaca: diaperType }), // Backward compatibility only if selected
        ...(selectedImage === 1 && diaperContent !== null && { diaperContent }),
        boobLeft: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualLeft * 60 : bfValues.timer1) : 0,
        boobRight: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualRight * 60 : bfValues.timer2) : 0,
        breastfeedingMode: selectedImage === 5 ? (bfValues?.mode ?? 'timer') : null,
        milkType: selectedImage === 0 ? milkType : null,
        sleepType: selectedImage === 3 ? sleepType : null,
        sleepLocation: selectedImage === 3 ? sleepLocation : null,
        ...(selectedImage === 4 && temperatureDuration && { temperatureDuration: parseInt(temperatureDuration) }),
        user: user.uid,
        createdBy: userInfo?.username || 'Unknown',
        comment: note,
      };

      await updateDoc(doc(db, 'Baby', document.id), {
        tasks: [...document.data().tasks, newTask],
      });

      // Update biberon widget if it's a bottle task
      if (selectedImage === 0) {
        const { updateBiberonWidget } = require('../utils/widgetBridge');
        updateBiberonWidget(Number(label) || 0, milkType, new Date(time));
      }

      console.log('Task created successfully');
      
      // Track time spent on final category before submit
      analytics.logEvent('category_time_spent', {
        category: returnLabel(selectedImage),
        category_id: selectedImage,
        duration_sec: Math.round((Date.now() - categoryEnterTimeRef.current) / 1000),
        submitted: true,
      });

      // Track task creation
      analytics.logEvent('task_created', {
        task_type: returnLabel(selectedImage),
        task_id: selectedImage,
        has_label: !!label,
        has_note: !!note,
        user_id: user.uid,
        ...(selectedImage === 0 && milkType !== null && { milk_type: milkType }),
        ...((selectedImage === 0 || selectedImage === 2) && label && { label_source: labelSource }),
        ...(selectedImage === 1 && diaperType !== null && { diaper_type: diaperType }),
        ...(selectedImage === 1 && diaperContent !== null && { diaper_content: diaperContent }),
        ...(selectedImage === 3 && { sleep_type: sleepType }),
        ...(selectedImage === 3 && sleepLocation !== null && { sleep_location: sleepLocation }),
        ...(selectedImage === 5 && bfValues?.mode && { breastfeeding_mode: bfValues.mode }),
      });
      
      // Incrémente le compteur et affiche la modal si besoin
      await handleTaskCreated();
      
      // Nettoyer les timers sauvegardés
      await breastfeedingRef.current?.clearTimers();

      setLoading(false);
      navigation.goBack();

    } catch (error: any) {
      console.error('Error updating document:', error);
      setLoading(false);
      
      let errorMessage = t('error.taskCreationFailed') || 'Unable to create task. Please try again.';
      if (error.code === 'permission-denied') {
        errorMessage = t('error.permissionDenied') || 'Permission denied';
      } else if (error.code === 'unavailable') {
        errorMessage = t('error.networkError') || 'Network error. Check your connection.';
      }
      
      Alert.alert(t('error.title'), errorMessage);
      
      analytics.logEvent('task_creation_failed', {
        task_type: returnLabel(selectedImage),
        task_id: selectedImage,
        user_id: user.uid,
        error_code: error.code || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleDateChange = (date: any) => {
    if (date) {
      setSelectedDate(date);
      setTime(moment(date).format('YYYY-MM-DD HH:mm:ss'));
      setIsDateManuallySet(true);
      setIsDateTimePickerVisible(false);
    }
  };

  const handleCategorie = (id: number) => {
    if (id == 0) {
      const ML_CHIPS = [[60, 80, 90, 100], [110, 120, 150, 180]];
      return (
        <View style={{ alignSelf: 'center', alignItems: 'center', gap: 10 }}>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[styles.input, { paddingRight: label.length > 0 ? 40 : 12 }]}
              keyboardType="numeric"
              onChangeText={(inputText) => { setLabel(inputText); setLabelSource('manual'); }}
              value={label}
              returnKeyLabel='Done'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              maxLength={10}
              placeholder={t('placeholder.millilitres')}
              placeholderTextColor="#9BA3A4"
              inputAccessoryViewID="none"
            />
            {label.length > 0 && (
              <TouchableOpacity onPress={() => setLabel('')} style={styles.medClearBtn}>
                <Text style={styles.medClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {ML_CHIPS.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              {row.map((ml) => {
                const isSelected = label === String(ml);
                return (
                  <TouchableOpacity
                    key={ml}
                    onPress={() => { const next = isSelected ? '' : String(ml); setLabel(next); setLabelSource(next ? 'chip' : 'manual'); if (!isSelected) Keyboard.dismiss(); }}
                    style={[styles.chipCard, isSelected && styles.chipCardSelected]}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{ml}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      );
    } else if (id == 1) {
      return null; // Diaper type selector moved to inline section below

    } else if (id == 2) {
      const MED_CHIPS = [
        t('medChips.vitaminD'), t('medChips.gaviscon'), t('medChips.doliprane'), t('medChips.inexium'),
        t('medChips.aspirin'), t('medChips.probiotics'), t('medChips.pediakid'), t('medChips.camilia'),
      ];
      return (
        <View style={{ width: 280, alignSelf: 'center', alignItems: 'center', gap: 10 }}>
          <View style={{ position: 'relative', width: 280 }}>
            <TextInput
              style={[styles.input, { paddingRight: label.length > 0 ? 40 : 12 }]}
              keyboardType='default'
              onChangeText={(inputText) => { setLabel(inputText); setLabelSource('manual'); }}
              value={label}
              returnKeyLabel='Done'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              maxLength={30}
              placeholder={t('placeholder.medicaments')}
              placeholderTextColor="#9BA3A4"
              inputAccessoryViewID="none"
            />
            {label.length > 0 && (
              <TouchableOpacity onPress={() => setLabel('')} style={styles.medClearBtn}>
                <Text style={styles.medClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {MED_CHIPS.map((chip) => {
              const isSelected = label.toLowerCase() === chip.toLowerCase();
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => { const next = isSelected ? '' : chip; setLabel(next); setLabelSource(next ? 'chip' : 'manual'); if (!isSelected) Keyboard.dismiss(); }}
                  style={[styles.chipCard, isSelected && styles.chipCardSelected]}
                >
                  <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{chip}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    } else if (id == 3) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <TextInput
            style={[styles.input, { width: 120, textAlign: 'center' }]}
            keyboardType="numeric"
            onChangeText={(v) => setSleepHours(v.replace(/[^0-9]/g, ''))}
            value={sleepHours}
            maxLength={2}
            placeholder={t('placeholder.sleepHours')}
            placeholderTextColor="#9BA3A4"
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            inputAccessoryViewID="none"
          />
          <TextInput
            style={[styles.input, { width: 120, textAlign: 'center' }]}
            keyboardType="numeric"
            onChangeText={(v) => setSleepMinutes(v.replace(/[^0-9]/g, ''))}
            value={sleepMinutes}
            maxLength={3}
            placeholder={t('placeholder.sleepMinutes')}
            placeholderTextColor="#9BA3A4"
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            inputAccessoryViewID="none"
          />
        </View>
      );

    } else if (id == 4) {
      return (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 22 }}>🌡️</Text>
            <TextInput
              style={[styles.input, { width: 120, textAlign: 'center' }]}
              keyboardType="numeric"
              onChangeText={(inputText) => setLabel(inputText)}
              value={label}
              returnKeyLabel='Done'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              maxLength={5}
              placeholder={t('placeholder.temperature')}
              placeholderTextColor="#9BA3A4"
              inputAccessoryViewID="none"
            />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 22 }}>⏱️</Text>
            <TextInput
              style={[styles.input, { width: 120, textAlign: 'center' }]}
              keyboardType="numeric"
              onChangeText={(inputText) => setTemperatureDuration(inputText)}
              value={temperatureDuration}
              returnKeyLabel='Done'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              maxLength={4}
              placeholder={t('placeholder.temperatureDuration')}
              placeholderTextColor="#9BA3A4"
              inputAccessoryViewID="none"
            />
          </View>
        </View>
      );

    } else if (id == 5) {
      return (
        <BreastfeedingSection
          ref={breastfeedingRef}
          t={t}
          liveActivity
          onSessionChange={({ startTime, mode }) => {
            setBfMode(mode);
            setBfStartTime(startTime);
            const locked = mode === 'timer' && startTime !== null;
            if (locked) {
              // La mesure du chrono devient la seule source de vérité pour la date
              setSelectedDate(new Date(startTime));
              setTime(moment(startTime).format('YYYY-MM-DD HH:mm:ss'));
              setIsDateManuallySet(false);
            } else if (bfLockedRef.current && startTime === null) {
              // Remise à zéro complète du chrono : on déverrouille et on revient à maintenant
              const now = new Date();
              setSelectedDate(now);
              setTime(moment(now).format('YYYY-MM-DD HH:mm:ss'));
              setIsDateManuallySet(false);
            }
            bfLockedRef.current = locked;
          }}
        />
      );
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={KEYBOARD_CONFIG.BEHAVIOR}
        keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
      >
        <View style={{ flex: 1, backgroundColor: '#FDF1E7', alignItems: 'center', paddingTop: 10, }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100, alignItems: 'center' }}
            showsVerticalScrollIndicator={true}
          >
            {/* Image picker */}
            <View style={{ flexDirection: 'row' }}>
              {IMAGES.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    Keyboard.dismiss();
                    const duration = Math.round((Date.now() - categoryEnterTimeRef.current) / 1000);
                    analytics.logEvent('category_time_spent', {
                      category: returnLabel(selectedImage),
                      category_id: selectedImage,
                      duration_sec: duration,
                    });
                    categoryEnterTimeRef.current = Date.now();
                    setSelectedImage(image.id);
                    setLabel('');
                  }}
                  style={[selectedImage == image.id ? styles.imageSelected : styles.imageNonSelected]}
                >
                  {handleImageType(image.id)}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Label */}
              <View style={{ paddingTop: 20, alignContent: 'center' }}>
                {handleCategorie(selectedImage)}
              </View>

              {/* Diaper Type (consistency) - Only for diaper (id === 1) */}
              {selectedImage === 1 && (
                <View style={{ paddingTop: 30, width: 280 }}>
                  <Text style={{ color: 'gray', paddingBottom: 12 }}>
                    {t('diapers.type')}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 8 }}>
                    {[
                      { value: 0, labelKey: 'diapers.dur' },
                      { value: 1, labelKey: 'diapers.mou' },
                      { value: 2, labelKey: 'diapers.liquide' },
                    ].map(({ value, labelKey }) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setDiaperType(diaperType === value ? null : value)}
                        style={[styles.chipCard, diaperType === value && styles.chipCardSelected]}
                      >
                        <Text style={[styles.chipLabel, diaperType === value && styles.chipLabelSelected]}>
                          {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Diaper Content - Only for diaper (id === 1) */}
              {selectedImage === 1 && (
                <View style={{ paddingTop: 30, width: 280 }}>
                  <Text style={{ color: 'gray', paddingBottom: 12 }}>
                    {t('diapers.content')}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 8 }}>
                    {[
                      { value: 0, emoji: '💦', labelKey: 'diapers.pee' },
                      { value: 1, emoji: '💩', labelKey: 'diapers.poop' },
                      { value: 2, emoji: '💦💩', labelKey: 'diapers.both' },
                    ].map(({ value, emoji, labelKey }) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setDiaperContent(diaperContent === value ? null : value)}
                        style={[styles.chipCard, diaperContent === value && styles.chipCardSelected]}
                      >
                        <Text style={[styles.chipLabel, diaperContent === value && styles.chipLabelSelected]}>
                          {emoji} {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Sleep Type - Only for sleep (id === 3) */}
              {selectedImage === 3 && (
                <View style={{ paddingTop: 30, width: 280 }}>
                  <Text style={{ color: 'gray', paddingBottom: 12 }}>
                    {t('sleepType.title')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                    {[
                      { value: 'nap',   emoji: '😴', labelKey: 'sleepType.nap'   },
                      { value: 'night', emoji: '🌙', labelKey: 'sleepType.night' },
                    ].map(({ value, emoji, labelKey }) => {
                      const isSelected = sleepType === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setSleepType(value)}
                          style={[styles.milkCard, isSelected && styles.milkCardSelected]}
                        >
                          {isSelected && (
                            <View style={styles.milkCheck}>
                              <Text style={styles.milkCheckText}>✓</Text>
                            </View>
                          )}
                          <Text style={styles.milkEmoji}>{emoji}</Text>
                          <Text style={[styles.milkLabel, isSelected && styles.milkLabelSelected]}>
                            {t(labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Sleep Location - Only for sleep (id === 3) */}
              {selectedImage === 3 && (
                <View style={{ paddingTop: 30, alignSelf: 'center', width: 280 }}>
                  <Text style={{ color: 'gray', paddingBottom: 12 }}>
                    {t('sleepLocation.title')}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    {[
                      { value: 'bed',     emoji: '🛏️', labelKey: 'sleepLocation.bed' },
                      { value: 'arms',    emoji: '🤲', labelKey: 'sleepLocation.arms' },
                      { value: 'bouncer', emoji: '🪑', labelKey: 'sleepLocation.bouncer' },
                      { value: 'other',   emoji: '💤', labelKey: 'sleepLocation.other' },
                    ].map(({ value, emoji, labelKey }) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setSleepLocation(sleepLocation === value ? null : value)}
                        style={[styles.locationChip, sleepLocation === value && styles.chipCardSelected]}
                      >
                        <Text style={styles.locationChipEmoji}>{emoji}</Text>
                        <Text style={[styles.chipLabel, sleepLocation === value && styles.chipLabelSelected]}>
                          {t(labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Time - Show for all tasks (including diaper) */}
              <View style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 16 }}>
                <Text style={{ color: 'gray', paddingBottom: 12 }}>
                  {t('task.whenTask')}
                </Text>
                {isDateLocked ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D8ABA0', borderRadius: 8, padding: 10 }}>
                    <Ionicons name="lock-closed" size={14} color="white" />
                    <Text style={{ color: 'white' }}>
                      {t('task.startedAt')} {moment(bfStartTime).format('DD MMM · HH:mm')}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => {isDateTimePickerVisible ? setIsDateTimePickerVisible(false) : setIsDateTimePickerVisible(true)}} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#C75B4A', borderRadius: 8, padding: 10, width: 120 }}>
                    <Text style={{color:"white"}}>{moment(selectedDate).format('DD MMM · HH:mm')}</Text>
                  </TouchableOpacity>
                )}

                <DateTimePicker
                  isVisible={isDateTimePickerVisible && !isDateLocked}
                  date={selectedDate}
                  onConfirm={(date) => handleDateChange(date)}
                  onCancel={() => setIsDateTimePickerVisible(false)}
                  minimumDate={new Date(new Date().setDate(new Date().getDate() - 7))}
                  maximumDate={new Date()}
                  mode="datetime"
                  is24Hour={true}
                  cancelTextIOS={t(`settings.cancel`)}
                  confirmTextIOS={t(`validateOnly`)}
                />
              </View>

              {/* Milk Type - Only for bottle (id === 0) */}
              {selectedImage === 0 && (
                <View style={{ paddingTop: 30, alignSelf: 'center' }}>
                  <Text style={{ color: 'gray', paddingBottom: 12 }}>
                    {t('milkType.title')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { value: 'artificial', emoji: '🥛', labelKey: 'milkType.artificial' },
                      { value: 'maternal',   emoji: '🤱', labelKey: 'milkType.maternal'   },
                    ].map(({ value, emoji, labelKey }) => {
                      const isSelected = milkType === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setMilkType(value)}
                          style={[styles.milkCard, isSelected && styles.milkCardSelected]}
                        >
                          {isSelected && (
                            <View style={styles.milkCheck}>
                              <Text style={styles.milkCheckText}>✓</Text>
                            </View>
                          )}
                          <Text style={styles.milkEmoji}>{emoji}</Text>
                          <Text style={[styles.milkLabel, isSelected && styles.milkLabelSelected]}>
                            {t(labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={{ paddingTop: 40, alignSelf: 'center' }}>
                <TextInput
                  style={styles.inputComment}
                  multiline
                  numberOfLines={3}
                  value={note}
                  placeholder={t('placeholder.comment')}
                  placeholderTextColor="#9BA3A4"
                  onChangeText={(inputText) => setNote(inputText)}
                  maxLength={60}
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID="none"
                />
              </View>
            </ScrollView>

          {/* Footer */}
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
            <TouchableOpacity onPress={updateBabyTasks} disabled={loading}>
              <View style={[styles.button, loading && styles.buttonDisabled]}>
                {loading ? (
                  <ActivityIndicator color="#F6F0EB" />
                ) : (
                  <Text style={styles.buttonText}>{t('button.validate')}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

export default CreateTask;

const styles = StyleSheet.create({

  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderColor: '#C75B4A',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputComment: {
    height: 100,
    width: 280,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  footer: {
    height: 100, // Adjust as needed
    justifyContent: 'center',
    alignItems: 'center',
    
    // Other styles for the footer
  },
  button: {
    backgroundColor: '#C75B4A', // Dark blue button background
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 300,
  },
  buttonDisabled: {
    backgroundColor: '#D8ABA0',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  milkTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C75B4A',
    backgroundColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  milkTypeButtonSelected: {
    backgroundColor: '#C75B4A',
  },
  milkTypeText: {
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: '600',
  },
  milkTypeTextSelected: {
    color: '#F6F0EB',
  },
  medChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C75B4A',
    backgroundColor: 'transparent',
  },
  medChipSelected: {
    backgroundColor: '#C75B4A',
  },
  medChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C75B4A',
  },
  medChipTextSelected: {
    color: '#FFF',
  },
  medClearBtn: {
    position: 'absolute',
    right: 8,
    top: 11,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C75B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medClearText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  locationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  locationChipEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  chipCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipCardSelected: { backgroundColor: '#C75B4A' },
  chipCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCheckText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipLabelSelected: { color: '#FFF' },
  milkCard: {
    width: 90,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  milkCardSelected: { backgroundColor: '#C75B4A' },
  milkCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milkCheckText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  milkEmoji: { fontSize: 26 },
  milkLabel: { fontSize: 11, fontWeight: '600', color: '#555' },
  milkLabelSelected: { color: '#FFF' },
  sleepLocationButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C75B4A',
    backgroundColor: 'transparent',
    width: '48%',
    alignItems: 'center',
    marginBottom: 8,
  },
  sleepLocationButtonSelected: {
    backgroundColor: '#C75B4A',
  },
  sleepLocationText: {
    color: '#C75B4A',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  sleepLocationTextSelected: {
    color: '#F6F0EB',
  },
});