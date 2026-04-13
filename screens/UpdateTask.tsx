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

const UpdateTask = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, babyID, userInfo } = useContext(AuthentificationUserContext);

  const [task] = useState(route.params.task);
  const [selectedImage, setSelectedImage] = useState(task ? task.id : 0);
  const [time, setTime] = useState(moment(route.params.task.date).format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState(task.label || '');
  const [note, setNote] = useState(task.comment || '');
  const [milkType, setMilkType] = useState<string | null>(task.milkType || null);
  const [diaperContent, setDiaperContent] = useState<number | null>(task.diaperContent ?? null);
  const [diaperType, setDiaperType] = useState<number | null>(task.diaperType ?? task.idCaca ?? null);
  const [sleepLocation, setSleepLocation] = useState<string | null>(task.sleepLocation || null);
  const [selectedDate, setSelectedDate] = useState(task.date ? new Date(task.date) : new Date());
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);
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
              label: label || 0,
              // Only include diaperType and diaperContent for diaper tasks (id === 1)
              ...(selectedImage === 1 && diaperType !== null && { diaperType }),
              ...(selectedImage === 1 && diaperType !== null && { idCaca: diaperType }), // Backward compatibility only if selected
              ...(selectedImage === 1 && diaperContent !== null && { diaperContent }),
              boobLeft: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualLeft * 60 : bfValues.timer1) : (task.boobLeft || 0),
              boobRight: bfValues ? (bfValues.mode === 'manual' ? bfValues.manualRight * 60 : bfValues.timer2) : (task.boobRight || 0),
              breastfeedingMode: selectedImage === 5 ? (bfValues?.mode ?? task.breastfeedingMode ?? 'timer') : null,
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
          placeholderTextColor="#9BA3A4"
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
            placeholderTextColor="#9BA3A4"
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
            placeholderTextColor="#9BA3A4"
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
            placeholderTextColor="#9BA3A4"
          />
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
                    🤲 {t('sleepLocation.arms')}
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
                    💤 {t('sleepLocation.other')}
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
                    🥛 {t('milkType.artificial')}
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
                    🤱 {t('milkType.maternal')}
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
});