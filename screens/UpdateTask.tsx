import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, ScrollView, TouchableWithoutFeedback, ActivityIndicator, Alert, AppState } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { babiesRef, userRef, db } from '../config.js';
import { query, getDocs, updateDoc, where, doc } from 'firebase/firestore';
import moment from 'moment';
import DateTimePicker from "react-native-modal-datetime-picker";
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import analytics from '../services/analytics';
import Allaitement from '../assets/allaitement-color.svg';
import Thermo from '../assets/thermo-color.svg';
import Dodo from '../assets/dodo-color.svg';
import Couche from '../assets/couche-color.svg';
import Sante from '../assets/sante-color.svg';
import Biberon from '../assets/biberon-color.svg';

const UpdateTask = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, babyID, userInfo } = useContext(AuthentificationUserContext);

  useEffect(() => {
    loadTimers();

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      clearInterval(interval1.current);
      clearInterval(interval2.current);
    };
  }, []);

  const [task, setTask] = useState(route.params.task);
  const [selectedImage, setSelectedImage] = useState(task ? task.id : 0);
  const [time, setTime] = useState(moment(route.params.task.date).format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState(task.label || '');
  const [note, setNote] = useState(task.comment || '');
  const [milkType, setMilkType] = useState<string | null>(task.milkType || null);
  const [diaperContent, setDiaperContent] = useState<number | null>(task.diaperContent ?? null); // 0=pee, 1=poop, 2=both
  const [diaperType, setDiaperType] = useState<number | null>(task.diaperType ?? task.idCaca ?? null); // 0=normal, 1=soft, 2=liquid
  const [sleepLocation, setSleepLocation] = useState<string | null>(task.sleepLocation || null); // bed, arms, breastfeeding, bottle, bouncer, other
  const [selectedDate, setSelectedDate] = useState(task.date ? new Date(task.date) : new Date());
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);

  const [timer1, setTimer1] = useState(task.boobLeft || 0);
  const [timer2, setTimer2] = useState(task.boobRight || 0);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [breastfeedingMode, setBreastfeedingMode] = useState<'timer' | 'manual'>(task.breastfeedingMode || 'timer');
  const [manualMinutesLeft, setManualMinutesLeft] = useState(Math.floor((task.boobLeft || 0) / 60));
  const [manualMinutesRight, setManualMinutesRight] = useState(Math.floor((task.boobRight || 0) / 60));
  const [loading, setLoading] = useState(false);
  const [startTime1, setStartTime1] = useState(null);
  const [startTime2, setStartTime2] = useState(null);
  const interval1 = useRef(null);
  const interval2 = useRef(null);
  const appState = useRef(AppState.currentState);

  const handleAppStateChange = async (nextAppState: any) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      await loadTimers();
    }
    appState.current = nextAppState;
  };

  const loadTimers = async () => {
    try {
      const timer1Data = await AsyncStorage.getItem(`timer1_updatetask_${task.uid}`);
      const timer2Data = await AsyncStorage.getItem(`timer2_updatetask_${task.uid}`);
      
      if (timer1Data) {
        const { elapsed, startTime, isRunning } = JSON.parse(timer1Data);
        if (isRunning && startTime) {
          // Recalculer le temps écoulé pendant que l'app était en background
          const now = Date.now();
          const additionalTime = Math.floor((now - startTime) / 1000);
          const newElapsed = elapsed + additionalTime;
          setTimer1(newElapsed);
          setStartTime1(startTime);
          setIsRunning1(true);
          // Relancer l'interval
          startTimerInterval(setTimer1, interval1, startTime, elapsed);
        } else {
          setTimer1(elapsed);
        }
      }
      
      if (timer2Data) {
        const { elapsed, startTime, isRunning } = JSON.parse(timer2Data);
        if (isRunning && startTime) {
          // Recalculer le temps écoulé pendant que l'app était en background
          const now = Date.now();
          const additionalTime = Math.floor((now - startTime) / 1000);
          const newElapsed = elapsed + additionalTime;
          setTimer2(newElapsed);
          setStartTime2(startTime);
          setIsRunning2(true);
          // Relancer l'interval
          startTimerInterval(setTimer2, interval2, startTime, elapsed);
        } else {
          setTimer2(elapsed);
        }
      }
    } catch (error) {
      console.error('Error loading timers:', error);
    }
  };

  const saveTimer = async (timerKey: string, elapsed: any, startTime: any, isRunning: any) => {
    try {
      await AsyncStorage.setItem(timerKey, JSON.stringify({ elapsed, startTime, isRunning }));
    } catch (error) {
      console.error('Error saving timer:', error);
    }
  };

  const startTimerInterval = (setTimer: any, interval: any, startTime: any, initialElapsed: any) => {
    clearInterval(interval.current);
    interval.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000) + initialElapsed;
      setTimer(elapsed);
    }, 1000);
  };

  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date);
      setTime(moment(date).format('YYYY-MM-DD HH:mm:ss'));
      setIsDateTimePickerVisible(false);
    }
  };

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad:'dur' },
    { id: 1, name: t('diapers.mou'), nameTrad:'mou' },
    { id: 2, name: t('diapers.liquide'), nameTrad:'liquide' },
  ];

  const updateBabyTasks = async () => {
    if (loading) return;
    
    setLoading(true);
    
    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      const querySnapshot = await getDocs(queryResult);
      
      if (querySnapshot.empty) {
        setLoading(false);
        Alert.alert(t('error.title'), t('error.babyNotFound') || 'Baby not found');
        return;
      }
      
      querySnapshot.forEach(async (document) => {
        const data = document.data();
        const tasks = data.tasks.map(t => {
          if (t.uid === task.uid) {
            const updatedTask = {
              ...t,
              id: selectedImage,
              date: time,
              label: label || 0,
              // Only include diaperType and diaperContent for diaper tasks (id === 1)
              ...(selectedImage === 1 && diaperType !== null && { diaperType }),
              ...(selectedImage === 1 && diaperType !== null && { idCaca: diaperType }), // Backward compatibility only if selected
              ...(selectedImage === 1 && diaperContent !== null && { diaperContent }),
              boobLeft: breastfeedingMode === 'manual' ? manualMinutesLeft * 60 : timer1,
              boobRight: breastfeedingMode === 'manual' ? manualMinutesRight * 60 : timer2,
              breastfeedingMode: selectedImage === 5 ? breastfeedingMode : null,
              milkType: selectedImage === 0 ? milkType : null,
              sleepLocation: selectedImage === 3 ? sleepLocation : null,
              // NE PAS MODIFIER user et createdBy - garder les valeurs originales
              comment: note,
            };
            // Remove diaper fields if not a diaper task (to avoid undefined in Firestore)
            if (selectedImage !== 1) {
              delete updatedTask.diaperType;
              delete updatedTask.diaperContent;
              delete updatedTask.idCaca;
            }
            // Remove diaper fields if user deselected them
            if (selectedImage === 1 && diaperType === null) {
              delete updatedTask.diaperType;
              delete updatedTask.idCaca;
            }
            if (selectedImage === 1 && diaperContent === null) {
              delete updatedTask.diaperContent;
            }
            return updatedTask;
          }
          return t;
        });

        await updateDoc(doc(db, 'Baby', document.id), { tasks });
      });

      console.log('Task updated successfully');

      // Nettoyer les timers sauvegardés
      await AsyncStorage.removeItem(`timer1_updatetask_${task.uid}`);
      await AsyncStorage.removeItem(`timer2_updatetask_${task.uid}`);
      
      setLoading(false);
      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating task:', error);
      setLoading(false);
      
      Alert.alert(
        t('error.title'),
        t('error.taskUpdateFailed') || 'Unable to update task. Please try again.'
      );
    }
  };

  const removeTaskFromBabyTasks = async () => {
    Alert.alert(
      t('task.deleteTitle') || 'Delete Task',
      t('task.deleteMessage') || 'Are you sure you want to delete this task?',
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            if (loading) return;
            
            setLoading(true);
            
            try {
              const queryResult = query(babiesRef, where('id', '==', babyID));
              const querySnapshot = await getDocs(queryResult);
              const updatePromises = querySnapshot.docs.map(async (document) => {
                const currentTasks = document.data().tasks;
                const updatedTasks = currentTasks.filter(task2 => task2.uid !== task.uid);
                await updateDoc(doc(db, 'Baby', document.id), { tasks: updatedTasks });
              });
              await Promise.all(updatePromises);

              // Nettoyer les timers sauvegardés
              await AsyncStorage.removeItem(`timer1_updatetask_${task.uid}`);
              await AsyncStorage.removeItem(`timer2_updatetask_${task.uid}`);
              
              setLoading(false);
              navigation.navigate('MainTabs');
            } catch (error: any) {
              console.error('Error removing task:', error);
              setLoading(false);
              
              Alert.alert(
                t('error.title'),
                t('error.taskDeleteFailed') || 'Unable to delete task. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleImageType = (id) => {
    switch (id) {
      case 0: return <Biberon height={65} width={65} />;
      case 1: return <Couche height={55} width={55} />;
      case 2: return <Sante height={55} width={55} />;
      case 3: return <Dodo height={55} width={55} />;
      case 4: return <Thermo height={55} width={55} />;
      case 5: return <Allaitement height={55} width={55} />;
      default: return null;
    }
  };

  const startTimer = (setTimer, setIsRunning, interval, timerNum) => {
    const now = Date.now();
    const currentElapsed = timerNum === 1 ? timer1 : timer2;
    const timerKey = timerNum === 1 ? `timer1_updatetask_${task.uid}` : `timer2_updatetask_${task.uid}`;
    
    if (timerNum === 1) {
      setStartTime1(now);
    } else {
      setStartTime2(now);
    }
    
    // Sauvegarder seulement au démarrage (pas à chaque seconde)
    saveTimer(timerKey, currentElapsed, now, true);
    
    setIsRunning(true);
    startTimerInterval(setTimer, interval, now, currentElapsed);
  };

  const pauseTimer = (setIsRunning, interval, timerNum) => {
    setIsRunning(false);
    clearInterval(interval.current);
    
    const currentElapsed = timerNum === 1 ? timer1 : timer2;
    const timerKey = timerNum === 1 ? `timer1_updatetask_${task.uid}` : `timer2_updatetask_${task.uid}`;
    
    // Sauvegarder sans startTime (timer en pause)
    saveTimer(timerKey, currentElapsed, null, false);
    
    if (timerNum === 1) {
      setStartTime1(null);
    } else {
      setStartTime2(null);
    }
  };

  const stopTimer = (setTimer, setIsRunning, interval, timerNum) => {
    setIsRunning(false);
    clearInterval(interval.current);
    setTimer(0);
    
    const timerKey = timerNum === 1 ? `timer1_updatetask_${task.uid}` : `timer2_updatetask_${task.uid}`;
    saveTimer(timerKey, 0, null, false);
    
    if (timerNum === 1) {
      setStartTime1(null);
    } else {
      setStartTime2(null);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCategorie = (id) => {
      if (id == 0) {
        return (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={(inputText) => setLabel(inputText)}
            value={label}
            returnKeyLabel='Done'
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            maxLength={10}
            placeholder={t('placeholder.millilitres')}
          />
        );
      } else if (id == 1) {
        return null; // Diaper type selector moved to inline section below
  
      } else if (id == 2) {
        return (
          <TextInput
            style={styles.input}
            keyboardType='default'
            onChangeText={(inputText) => setLabel(inputText)}
            value={label}
            returnKeyLabel='Done'
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            maxLength={20}
            placeholder={t('placeholder.medicaments')}
          />
        );
  
      } else if (id == 3) {
        return (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={(inputText) => setLabel(inputText)}
            value={label}
            returnKeyLabel='Done'
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            maxLength={10}
            placeholder={t('placeholder.sleepTime')}
          />
        );
  
      } else if (id == 4) {
        return (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            onChangeText={(inputText) => setLabel(inputText)}
            value={label}
            returnKeyLabel='Done'
            returnKeyType='done'
            onSubmitEditing={Keyboard.dismiss}
            maxLength={10}
            placeholder={t('placeholder.temperature')}
          />
        );
  
      } else if (id == 5) {
        return (
          <View>
            {/* Mode Switch */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setBreastfeedingMode('timer')}
                style={[
                  styles.modeButton,
                  breastfeedingMode === 'timer' && styles.modeButtonSelected
                ]}
              >
                <Text style={[
                  styles.modeButtonText,
                  breastfeedingMode === 'timer' && styles.modeButtonTextSelected
                ]}>
                  ⏱️ {t('breastfeeding.timer')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBreastfeedingMode('manual')}
                style={[
                  styles.modeButton,
                  breastfeedingMode === 'manual' && styles.modeButtonSelected
                ]}
              >
                <Text style={[
                  styles.modeButtonText,
                  breastfeedingMode === 'manual' && styles.modeButtonTextSelected
                ]}>
                  ✏️ {t('breastfeeding.manual')}
                </Text>
              </TouchableOpacity>
            </View>

            {breastfeedingMode === 'timer' ? (
              // Timer Mode
              <View>
                <View style={styles.timerContainer}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#7A8889', marginBottom: 10 }}>{t('breast.left')}</Text>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 10 }}>{formatTime(timer1)}</Text>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      onPress={() => startTimer(setTimer1, setIsRunning1, interval1, 1)} 
                      disabled={isRunning1}
                      style={[styles.timerButton, isRunning1 && styles.timerButtonDisabled]}
                    >
                      <Ionicons name="play" size={24} color={isRunning1 ? "#D8ABA0" : "#F6F0EB"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => pauseTimer(setIsRunning1, interval1, 1)} 
                      disabled={!isRunning1}
                      style={[styles.timerButton, !isRunning1 && styles.timerButtonDisabled]}
                    >
                      <Ionicons name="pause" size={24} color={!isRunning1 ? "#D8ABA0" : "#F6F0EB"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => stopTimer(setTimer1, setIsRunning1, interval1, 1)}
                      style={styles.timerButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#F6F0EB" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.timerContainer}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#7A8889', marginBottom: 10 }}>{t('breast.right')}</Text>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 10 }}>{formatTime(timer2)}</Text>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      onPress={() => startTimer(setTimer2, setIsRunning2, interval2, 2)} 
                      disabled={isRunning2}
                      style={[styles.timerButton, isRunning2 && styles.timerButtonDisabled]}
                    >
                      <Ionicons name="play" size={24} color={isRunning2 ? "#D8ABA0" : "#F6F0EB"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => pauseTimer(setIsRunning2, interval2, 2)} 
                      disabled={!isRunning2}
                      style={[styles.timerButton, !isRunning2 && styles.timerButtonDisabled]}
                    >
                      <Ionicons name="pause" size={24} color={!isRunning2 ? "#D8ABA0" : "#F6F0EB"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => stopTimer(setTimer2, setIsRunning2, interval2, 2)}
                      style={styles.timerButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#F6F0EB" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // Manual Mode
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 5 }}>{manualMinutesLeft} {t('min')}</Text>
                  <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Slider
                      style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                      minimumValue={0}
                      maximumValue={60}
                      step={1}
                      value={manualMinutesLeft}
                      onValueChange={(value) => setManualMinutesLeft(Math.round(value))}
                      minimumTrackTintColor="#C75B4A"
                      maximumTrackTintColor="#D8ABA0"
                      thumbTintColor="#C75B4A"
                    />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#7A8889', marginTop: 5 }}>{t('breast.left')}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 5 }}>{manualMinutesRight} {t('min')}</Text>
                  <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Slider
                      style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                      minimumValue={0}
                      maximumValue={60}
                      step={1}
                      value={manualMinutesRight}
                      onValueChange={(value) => setManualMinutesRight(Math.round(value))}
                      minimumTrackTintColor="#C75B4A"
                      maximumTrackTintColor="#D8ABA0"
                      thumbTintColor="#C75B4A"
                    />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#7A8889', marginTop: 5 }}>{t('breast.right')}</Text>
                </View>
              </View>
            )}
          </View>
        )
      }
    }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={true}
        >
          {/* Image Picker */}
          <View style={styles.imagePicker}>
            {handleImageType(task.id)}
          </View>

          <View style={{ paddingTop: 20, alignContent: 'center' }}>
            {handleCategorie(selectedImage)}
          </View>

          {/* Diaper Type (consistency) - Only for diaper (id === 1) */}
          {selectedImage === 1 && (
            <View style={{ paddingTop: 30 }}>
              <Text style={{ color: 'gray', paddingBottom: 12 }}>
                {t('diapers.type')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 5 }}>
                <TouchableOpacity
                  onPress={() => setDiaperType(diaperType === 0 ? null : 0)}
                  style={[
                    styles.milkTypeButton,
                    diaperType === 0 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperType === 0 && styles.milkTypeTextSelected
                  ]}>
                    {t('diapers.dur')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiaperType(diaperType === 1 ? null : 1)}
                  style={[
                    styles.milkTypeButton,
                    diaperType === 1 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperType === 1 && styles.milkTypeTextSelected
                  ]}>
                    {t('diapers.mou')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiaperType(diaperType === 2 ? null : 2)}
                  style={[
                    styles.milkTypeButton,
                    diaperType === 2 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperType === 2 && styles.milkTypeTextSelected
                  ]}>
                    {t('diapers.liquide')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Diaper Content - Only for diaper (id === 1) */}
          {selectedImage === 1 && (
            <View style={{ paddingTop: 30 }}>
              <Text style={{ color: 'gray', paddingBottom: 12 }}>
                {t('diapers.content')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 5 }}>
                <TouchableOpacity
                  onPress={() => setDiaperContent(diaperContent === 0 ? null : 0)}
                  style={[
                    styles.milkTypeButton,
                    diaperContent === 0 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperContent === 0 && styles.milkTypeTextSelected
                  ]}>
                    💦 {t('diapers.pee')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiaperContent(diaperContent === 1 ? null : 1)}
                  style={[
                    styles.milkTypeButton,
                    diaperContent === 1 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperContent === 1 && styles.milkTypeTextSelected
                  ]}>
                    💩 {t('diapers.poop')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiaperContent(diaperContent === 2 ? null : 2)}
                  style={[
                    styles.milkTypeButton,
                    diaperContent === 2 && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    diaperContent === 2 && styles.milkTypeTextSelected
                  ]}>
                    💦💩 {t('diapers.both')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sleep Location - Only for sleep (id === 3) */}
          {selectedImage === 3 && (
            <View style={{ paddingTop: 30, alignSelf: 'center', width: 280 }}>
              <Text style={{ color: 'gray', paddingBottom: 12 }}>
                {t('sleepLocation.title')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'bed' ? null : 'bed')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'bed' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'bed' && styles.sleepLocationTextSelected
                  ]}>
                    🛏️ {t('sleepLocation.bed')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'arms' ? null : 'arms')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'arms' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'arms' && styles.sleepLocationTextSelected
                  ]}>
                    🤱 {t('sleepLocation.arms')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'breastfeeding' ? null : 'breastfeeding')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'breastfeeding' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'breastfeeding' && styles.sleepLocationTextSelected
                  ]}>
                    🤱 {t('sleepLocation.breastfeeding')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'bottle' ? null : 'bottle')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'bottle' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'bottle' && styles.sleepLocationTextSelected
                  ]}>
                    🍼 {t('sleepLocation.bottle')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'bouncer' ? null : 'bouncer')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'bouncer' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'bouncer' && styles.sleepLocationTextSelected
                  ]}>
                    🪑 {t('sleepLocation.bouncer')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSleepLocation(sleepLocation === 'other' ? null : 'other')}
                  style={[
                    styles.sleepLocationButton,
                    sleepLocation === 'other' && styles.sleepLocationButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.sleepLocationText,
                    sleepLocation === 'other' && styles.sleepLocationTextSelected
                  ]}>
                    {t('sleepLocation.other')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Time Picker - Unified for all tasks */}
          <View style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <Text style={{ color: 'gray', paddingBottom: 12 }}>{t('task.whenTask')}</Text>
            <TouchableOpacity
              onPress={() => setIsDateTimePickerVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#C75B4A', borderRadius: 8, padding: 10, width: 120 }}
            >
              <Text style={{color:"white"}}>{moment(selectedDate).format('DD MMM · HH:mm')}</Text>
            </TouchableOpacity>
            <DateTimePicker
              isVisible={isDateTimePickerVisible}
              onConfirm={(date) => handleDateChange(date)}
              onCancel={() => setIsDateTimePickerVisible(false)}
              minimumDate={new Date(new Date().setDate(new Date().getDate() - 7))}
              maximumDate={new Date()}
              mode="datetime"
              is24Hour={true}
              cancelTextIOS={t('settings.cancel')}
              confirmTextIOS={t('validateOnly')}
              date={selectedDate}
            />
          </View>

          {/* Milk Type - Only for bottle (id === 0) */}
          {selectedImage === 0 && (
            <View style={{ paddingTop: 30, alignSelf: 'center' }}>
              <Text style={{ color: 'gray', paddingBottom: 12 }}>
                {t('milkType.title')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 5 }}>
                <TouchableOpacity
                  onPress={() => setMilkType(milkType === 'artificial' ? null : 'artificial')}
                  style={[
                    styles.milkTypeButton,
                    milkType === 'artificial' && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    milkType === 'artificial' && styles.milkTypeTextSelected
                  ]}>
                    {t('milkType.artificial')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMilkType(milkType === 'maternal' ? null : 'maternal')}
                  style={[
                    styles.milkTypeButton,
                    milkType === 'maternal' && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    milkType === 'maternal' && styles.milkTypeTextSelected
                  ]}>
                    {t('milkType.maternal')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMilkType(milkType === 'other' ? null : 'other')}
                  style={[
                    styles.milkTypeButton,
                    milkType === 'other' && styles.milkTypeButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.milkTypeText,
                    milkType === 'other' && styles.milkTypeTextSelected
                  ]}>
                    {t('milkType.other')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputComment}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
              placeholder={t('placeholder.comment')}
              maxLength={60}
            />
          </View>
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerLabel}>{t('Par')}</Text>
            <Text>{task.createdBy}</Text>
            </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={updateBabyTasks} disabled={loading}>
            <View style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? (
                <ActivityIndicator color="#F6F0EB" />
              ) : (
                <Text style={styles.buttonText}>{t('button.validate')}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={removeTaskFromBabyTasks} disabled={loading}>
            <View style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? (
                <ActivityIndicator color="#F6F0EB" />
              ) : (
                <Text style={styles.buttonText}>{t('button.delete')}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default UpdateTask;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
    alignItems: 'center',
    paddingTop: 10,
  },
  imagePicker: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 85,
    height: 85,
    borderColor: '#C75B4A',
    borderWidth: 5,
    borderRadius: 60,
  },
  inputContainer: {
    paddingTop: 20,
  },
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
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
  },
  timePickerContainer: {
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  timePickerLabel: {
    color: 'gray',
    paddingBottom: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    padding: 10,
    width: 120,
  },
  timePickerText: {
    color: 'white',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
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
  imageSelected: {
    width: 60,
                height: 60,
                resizeMode: 'cover',
                borderColor: '#C75B4A',
                borderWidth:5,
                borderRadius:60, 
                justifyContent:'center',
                alignItems:'center'
  },
  imageNonSelected: {
    width: 60,
                height: 60,
                resizeMode: 'cover',
                borderWidth:5,
                borderRadius:60, 
                justifyContent:'center',
                alignItems:'center',
                borderColor: 'transparent'
  },
  timerContainer: {
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F6F0EB',
    borderRadius: 12,
    width: 280,
    alignSelf: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  timerButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerButtonDisabled: {
    backgroundColor: '#D8ABA0',
    opacity: 0.5,
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
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C75B4A',
    backgroundColor: 'transparent',
    minWidth: 120,
    alignItems: 'center',
  },
  modeButtonSelected: {
    backgroundColor: '#C75B4A',
  },
  modeButtonText: {
    color: '#C75B4A',
    fontSize: 16,
    fontWeight: '600',
  },
  modeButtonTextSelected: {
    color: '#F6F0EB',
  },
});