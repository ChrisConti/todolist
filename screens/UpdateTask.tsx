import React, { useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, ScrollView, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { babiesRef, userRef, db } from '../config.js';
import { query, getDocs, getDocsFromServer, updateDoc, where, doc } from 'firebase/firestore';
import moment from 'moment';
import DateTimePicker from "react-native-modal-datetime-picker";
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import BreastfeedingSection, { BreastfeedingRef } from '../components/BreastfeedingSection';
import Allaitement from '../assets/allaitement-color.svg';
import Thermo from '../assets/thermo-color.svg';
import Dodo from '../assets/dodo-color.svg';
import Couche from '../assets/couche-color.svg';
import Sante from '../assets/sante-color.svg';
import Biberon from '../assets/biberon-color.svg';
import Analytics from '../services/analytics';
import { TASK_LABELS } from '../utils/constants';

const UpdateTask = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, babyID, userInfo } = useContext(AuthentificationUserContext);

  const [task] = useState(route.params.task);
  const [selectedImage, setSelectedImage] = useState(task ? task.id : 0);
  const [time, setTime] = useState(moment(route.params.task.date).format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState(task.label || '');
  const [note, setNote] = useState(task.comment || '');
  const [milkType, setMilkType] = useState<string>(task.milkType || 'artificial');
  const [diaperContent, setDiaperContent] = useState<number | null>(task.diaperContent ?? null);
  const [diaperType, setDiaperType] = useState<number | null>(task.diaperType ?? task.idCaca ?? null);
  const [sleepType, setSleepType] = useState<string>(task.sleepType || 'nap');
  const [sleepLocation, setSleepLocation] = useState<string | null>(task.sleepLocation || null);
  const _sleepTotal = task.id === 3 ? parseInt(String(task.label || '0')) || 0 : 0;
  const [sleepHours, setSleepHours] = useState<string>(_sleepTotal > 0 ? (Math.floor(_sleepTotal / 60) > 0 ? String(Math.floor(_sleepTotal / 60)) : '') : '');
  const [sleepMinutes, setSleepMinutes] = useState<string>(_sleepTotal > 0 ? String(_sleepTotal % 60) : '');
  const [selectedDate, setSelectedDate] = useState(task.date ? new Date(task.date) : new Date());
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);
  const [temperatureDuration, setTemperatureDuration] = useState<string>(task.temperatureDuration ? String(task.temperatureDuration) : '');
  const [labelSource, setLabelSource] = useState<'chip' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const breastfeedingRef = useRef<BreastfeedingRef>(null);

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

    setLoading(true);
    
    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      const querySnapshot = await getDocsFromServer(queryResult);

      if (querySnapshot.empty) {
        setLoading(false);
        Alert.alert(t('error.title'), t('error.babyNotFound') || 'Baby not found');
        return;
      }
      
      for (const document of querySnapshot.docs) {
        const data = document.data();
        const bfValues = breastfeedingRef.current?.getValues();
        const tasks = data.tasks.map(t => {
          if (t.uid === task.uid) {
            const updatedTask = {
              ...t,
              id: selectedImage,
              date: time,
              label: selectedImage === 3
                ? ((sleepHours || sleepMinutes) ? String(parseInt(sleepHours || '0') * 60 + parseInt(sleepMinutes || '0')) : 0)
                : (label || 0),
              // Only include diaperType and diaperContent for diaper tasks (id === 1)
              ...(selectedImage === 1 && diaperType !== null && { diaperType }),
              ...(selectedImage === 1 && diaperType !== null && { idCaca: diaperType }), // Backward compatibility only if selected
              ...(selectedImage === 1 && diaperContent !== null && { diaperContent }),
              boobLeft: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualLeft * 60 : bfValues.timer1) : (task.boobLeft || 0),
              boobRight: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualRight * 60 : bfValues.timer2) : (task.boobRight || 0),
              breastfeedingMode: selectedImage === 5 ? (bfValues?.mode ?? task.breastfeedingMode ?? 'timer') : null,
              milkType: selectedImage === 0 ? milkType : null,
              sleepType: selectedImage === 3 ? sleepType : null,
              sleepLocation: selectedImage === 3 ? sleepLocation : null,
              ...(selectedImage === 4 && temperatureDuration && { temperatureDuration: parseInt(temperatureDuration) }),
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

        Analytics.logEvent('task_updated', {
          task_type: TASK_LABELS[selectedImage] || 'unknown',
          baby_id: babyID,
          ...(selectedImage === 0 && milkType !== null && { milk_type: milkType }),
          ...((selectedImage === 0 || selectedImage === 2) && label && { label_source: labelSource }),
          ...(selectedImage === 1 && diaperType !== null && { diaper_type: diaperType }),
          ...(selectedImage === 1 && diaperContent !== null && { diaper_content: diaperContent }),
          ...(selectedImage === 3 && { sleep_type: sleepType }),
          ...(selectedImage === 3 && sleepLocation !== null && { sleep_location: sleepLocation }),
        });

        // Update biberon widget if it's a bottle task
        if (selectedImage === 0) {
          const { updateBiberonWidget } = require('../utils/widgetBridge');
          updateBiberonWidget(Number(label) || 0, milkType, new Date(selectedDate));
        }
      }

      // Nettoyer les timers sauvegardés
      await breastfeedingRef.current?.clearTimers();

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
              const querySnapshot = await getDocsFromServer(queryResult);
              const updatePromises = querySnapshot.docs.map(async (document) => {
                const currentTasks = document.data().tasks;
                const updatedTasks = currentTasks.filter(task2 => task2.uid !== task.uid);
                await updateDoc(doc(db, 'Baby', document.id), { tasks: updatedTasks });
              });
              await Promise.all(updatePromises);

              Analytics.logEvent('task_deleted', {
                task_type: TASK_LABELS[task.id] || 'unknown',
                baby_id: babyID,
              });

              // Nettoyer les timers sauvegardés
              await breastfeedingRef.current?.clearTimers();

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

  const handleCategorie = (id) => {
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
                      {isSelected && <View style={styles.chipCheck}><Text style={styles.chipCheckText}>✓</Text></View>}
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
              />
            </View>
          </View>
        );
  
      } else if (id == 5) {
        return (
          <BreastfeedingSection
            ref={breastfeedingRef}
            t={t}
            initialTimer1={task.breastfeedingMode === 'timer' ? (task.boobLeft || 0) : 0}
            initialTimer2={task.breastfeedingMode === 'timer' ? (task.boobRight || 0) : 0}
            initialMode={task.breastfeedingMode || 'timer'}
            initialManualLeft={task.breastfeedingMode === 'manual' ? Math.floor((task.boobLeft || 0) / 60) : 0}
            initialManualRight={task.breastfeedingMode === 'manual' ? Math.floor((task.boobRight || 0) / 60) : 0}
            storageKeySuffix={`updatetask_${task.uid}`}
          />
        );
      }
    }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ paddingBottom: 180, alignItems: 'center' }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
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

          {/* Time Picker - Unified for all tasks */}
          <View style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 16 }}>
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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputComment}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
              placeholder={t('placeholder.comment')}
              placeholderTextColor="#9BA3A4"
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
    backgroundColor: '#FFFFFF',
    color: '#333333',
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
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'column',
    backgroundColor: '#FDF1E7',
    paddingTop: 10,
    paddingBottom: 10,
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