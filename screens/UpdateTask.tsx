import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, ScrollView, TouchableWithoutFeedback, ActivityIndicator, Alert, AppState } from 'react-native';
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
    analytics.logScreenView('UpdateTask');
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
  const [selectedDate, setSelectedDate] = useState(task.date ? new Date(task.date) : new Date());
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(task.idCaca || 0);

  const [timer1, setTimer1] = useState(task.boobLeft || 0);
  const [timer2, setTimer2] = useState(task.boobRight || 0);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
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
            return {
              ...t,
              id: selectedImage,
              date: time,
              label: label || 0,
              idCaca: label,
              boobLeft: timer1,
              boobRight: timer2,
              // NE PAS MODIFIER user et createdBy - garder les valeurs originales
              comment: note,
            };
          }
          return t;
        });

        await updateDoc(doc(db, 'Baby', document.id), { tasks });
      });
      
      console.log('Task updated successfully');
      
      analytics.logEvent('task_updated', {
        taskId: selectedImage,
        hasNote: !!note,
        userId: user.uid
      });
      
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
      
      analytics.logEvent('task_update_failed', {
        taskId: selectedImage,
        userId: user.uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
              
              analytics.logEvent('task_deleted', {
                taskId: task.id,
                userId: user.uid
              });
              
              // Nettoyer les timers sauvegardés
              await AsyncStorage.removeItem(`timer1_updatetask_${task.uid}`);
              await AsyncStorage.removeItem(`timer2_updatetask_${task.uid}`);
              
              setLoading(false);
              navigation.navigate('BabyList');
            } catch (error: any) {
              console.error('Error removing task:', error);
              setLoading(false);
              
              Alert.alert(
                t('error.title'),
                t('error.taskDeleteFailed') || 'Unable to delete task. Please try again.'
              );
              
              analytics.logEvent('task_delete_failed', {
                taskId: task.id,
                userId: user.uid,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
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
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}> 
            {imagesDiapers.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setSelectedItem(index);
                  setLabel('' + image.id);
                }}
                style={[selectedItem == image.id ? styles.imageSelected : styles.imageNonSelected]}
              >
                <Text>{image.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
  
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
            <View style={styles.timerContainer}>
          <Text>{t('breast.left')} {formatTime(timer1)}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => startTimer(setTimer1, setIsRunning1, interval1, 1)} disabled={isRunning1}>
              <Ionicons name="play" size={24} color={isRunning1 ? "#C75B4A" : "black"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pauseTimer(setIsRunning1, interval1, 1)} disabled={!isRunning1}>
              <Ionicons name="pause" size={24} color={!isRunning1 ? "#C75B4A" : "black"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopTimer(setTimer1, setIsRunning1, interval1, 1)}>
              <Ionicons name="close-circle" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.timerContainer}>
          <Text>{t('breast.right')} {formatTime(timer2)}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => startTimer(setTimer2, setIsRunning2, interval2, 2)} disabled={isRunning2}>
              <Ionicons name="play" size={24} color={isRunning2 ? "#C75B4A" : "black"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pauseTimer(setIsRunning2, interval2, 2)} disabled={!isRunning2}>
              <Ionicons name="pause" size={24} color={!isRunning2 ? "#C75B4A" : "black"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopTimer(setTimer2, setIsRunning2, interval2, 2)}>
              <Ionicons name="close-circle" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
          </View>
        )
      }
    }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView>
          {/* Image Picker */}
          <View style={styles.imagePicker}>
            {handleImageType(task.id)}
          </View>

          <View style={{ paddingTop: 20, alignContent: 'center' }}>
            {handleCategorie(selectedImage)}
          </View>

          {/* Time Picker */}
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerLabel}>{t('task.whenTask')}</Text>
            <TouchableOpacity
              onPress={() => setIsDateTimePickerVisible(true)}
              style={styles.timePickerButton}
            >
              <Text style={styles.timePickerText}>{moment(selectedDate).format('DD MMM · HH:mm')}</Text>
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    marginTop: 10,
  },
});