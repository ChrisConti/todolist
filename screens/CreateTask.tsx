import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, TextInput, Keyboard, ScrollView, FlatList, TouchableWithoutFeedback, Button } from 'react-native';
import s from "../Style.js";
import { auth, db, babiesRef, userRef } from '../config.js';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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

const CreateTask = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { task } = '';
  //const { babyID } = route.params;
  
  const { user, setUser, babyID, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);
  const [selectedImage, setSelectedImage] = task ? task.id : useState(0);
  const [time, setTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(0);
  const uniqueId = uuid.v4();
  const [timer1, setTimer1] = useState(0);
  const [timer2, setTimer2] = useState(0);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [isDateTimePickerVisible, setIsDateTimePickerVisible] = useState(false);
  const interval1 = useRef(null);
  const interval2 = useRef(null);

  const queryResult = query(userRef, where('userId', '==', user.uid));

  useEffect(() => {
    // Track screen view
    analytics.logScreenView('CreateTask');
    //DocFinder(queryResult);
  }, []);

  // date picker
  const showDateTimePicker = () => {
    setIsDateTimePickerVisible(true);
  };

  const handleImageType = (id) => {
    if (id == 0) return <Biberon height={45} width={45} />;
    if (id == 1) return <Couche height={35} width={35} />;
    if (id == 2) return <Sante height={35} width={35} />;
    if (id == 3) return <Dodo height={35} width={35} />;
    if (id == 4) return <Thermo height={35} width={35} />;
    if (id == 5) return <Allaitement height={35} width={35} />;
  };

  const images = [
    { id: 0, rq: require('../assets/biberon.png') },
    { id: 5, rq: require('../assets/allaitement.png') },
    { id: 3, rq: require('../assets/sommeil.png') },
    { id: 1, rq: require('../assets/diaper.png') },
    { id: 4, rq: require('../assets/thermo.png') },
    { id: 2, rq: require('../assets/medicaments.png') },
  ];

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad:'dur' },
    { id: 1, name: t('diapers.mou'), nameTrad:'mou' },
    { id: 2, name: t('diapers.liquide'), nameTrad:'liquide' },
  ];
  const returnLabel = (id) => {
    if (id == 0) return 'biberon';
    if (id == 1) return 'couche';
    if (id == 2) return 'Sante';
    if (id == 3) return 'sommeil';
    if (id == 4) return 'thermo';
    if (id == 5) return 'allaitement';

    return 
  }

  const updateBabyTasks = async () => {
    const queryResult = query(babiesRef, where('id', '==', babySelected));
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        //console.log('Document data:', document.data());
        await updateDoc(doc(db, 'Baby', document.id), {
          tasks: [...document.data().tasks, 
            { uid: uniqueId, 
              id: selectedImage, 
              labelTask: returnLabel(selectedImage),
              date: time, 
              label: label ? label : 0, 
              idCaca:label,
              boobLeft: timer1,
              boobRight: timer2,
              user: user.uid, 
              createdBy: userInfo?.username || 'Unknown', 
              comment: note }],
        }).then(() => {
          console.log('success');
          // Track task creation
          analytics.logEvent('task_created', {
            taskType: returnLabel(selectedImage),
            taskId: selectedImage,
            hasLabel: !!label,
            hasNote: !!note,
            userId: user.uid
          });
        });
      });

      navigation.goBack();

    } catch (error) {
      console.error('Error updating document:', error);
      
      analytics.logEvent('task_creation_failed', {
        taskType: returnLabel(selectedImage),
        taskId: selectedImage,
        userId: user.uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date);
      setTime(moment(date).format('YYYY-MM-DD HH:mm:ss'));
      setIsDateTimePickerVisible(false);
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
          <TouchableOpacity onPress={() => startTimer(setTimer1, setIsRunning1, interval1)} disabled={isRunning1}>
            <Ionicons name="play" size={24} color={isRunning1 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pauseTimer(setIsRunning1, interval1)} disabled={!isRunning1}>
            <Ionicons name="pause" size={24} color={!isRunning1 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => stopTimer(setTimer1, setIsRunning1, interval1)}>
            <Ionicons name="close-circle" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.timerContainer}>
        <Text>{t('breast.right')} {formatTime(timer2)}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => startTimer(setTimer2, setIsRunning2, interval2)} disabled={isRunning2}>
            <Ionicons name="play" size={24} color={isRunning2 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pauseTimer(setIsRunning2, interval2)} disabled={!isRunning2}>
            <Ionicons name="pause" size={24} color={!isRunning2 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => stopTimer(setTimer2, setIsRunning2, interval2)}>
            <Ionicons name="close-circle" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
        </View>
      )
    }
  }

  const startTimer = (setTimer, setIsRunning, interval) => {
    setIsRunning(true);
    interval.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = (setIsRunning, interval) => {
    setIsRunning(false);
    clearInterval(interval.current);
  };

  const stopTimer = (setTimer, setIsRunning, interval) => {
    setIsRunning(false);
    clearInterval(interval.current);
    setTimer(0);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#FDF1E7', alignItems: 'center', paddingTop: 10, }}>
        <ScrollView>
          {/* Image picker */}
          <View style={{ flexDirection: 'row' }}>
            {images.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setSelectedImage(image.id);
                  image.id == 1 ? setLabel(imagesDiapers[0].id.toString()) : setLabel('');
                  setSelectedItem(0);
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

          {/* Time */}
            <View style={{ paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <Text style={{ color: 'gray', paddingBottom: 12 }}>
              {t('task.whenTask')}
            </Text> 
            <TouchableOpacity onPress={() => {isDateTimePickerVisible ? setIsDateTimePickerVisible(false) : setIsDateTimePickerVisible(true)}} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#C75B4A', borderRadius: 8, padding: 10, width: 120 }}>
              <Text style={{color:"white"}}>{moment(selectedDate).format('DD MMM · HH:mm')}</Text> 
            </TouchableOpacity>

            <DateTimePicker
              isVisible={isDateTimePickerVisible}
              onConfirm={(date) => handleDateChange(date)}
              onCancel={()=> {
              setIsDateTimePickerVisible(false);
              setSelectedDate(new Date());
              }}
              minimumDate={new Date(new Date().setDate(new Date().getDate() - 7))}
              maximumDate={new Date()}
              mode="datetime"
              is24Hour={true}
              cancelTextIOS={t(`settings.cancel`)}
              confirmTextIOS={t(`validateOnly`)}
            />
            </View>

          {/* Notes */}
          <View style={{ paddingTop: 40, alignSelf: 'center' }}>
            <TextInput
              style={styles.inputComment}
              multiline
              numberOfLines={3}
              value={note}
              placeholder={t('placeholder.comment')}
              onChangeText={(inputText) => setNote(inputText)}
              maxLength={60}
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
          alignItems: 'center',
          justifyContent: 'flex-end', // Pushes the button to the bottom
          flexDirection: 'column',
        }}>
          <TouchableOpacity onPress={updateBabyTasks}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>{t('button.validate')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    alignSelf: 'center',
    //backgroundColor: 'white', // White input background
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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