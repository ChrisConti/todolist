import React, { useContext, useEffect, useState,  } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, TextInput, Keyboard, ScrollView, FlatList } from 'react-native';
import s from "./Style.js";
import { auth, db, babiesRef, userRef } from './config.js';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import moment from 'moment';
import DateTimePicker from '@react-native-community/datetimepicker';
import uuid from 'react-native-uuid';
import ListItem from "./ListItem";
import Timer from './timers'
import { AuthentificationUserContext } from './Context/AuthentificationContext';

const CreateTask = ({ route, navigation }) => {
  const { task } = '';
  //const { babyID } = route.params ;

  const {user, setUser, babyID, setBabyID, userInfo} = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);
  const [selectedImage, setSelectedImage] = task ? task.id : useState(0);
  const [time, setTime] = useState(moment().format('YYYY-MM-DD HH:mm:ss'));
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [labelButtonTime, setlabelButtonTime] = useState('Avant');
  const [selectedTime, setSelectedTime] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(0);
  const uniqueId = uuid.v4();
  //console.log(babyID)

  const queryResult = query(userRef, where('userId', '==', user.uid));

  useEffect(()=> {
    //if(!user) return
    DocFinder(queryResult)
  },[])

  async function DocFinder(queryResult) {
    // get from the user his baby favorite to display it first on home
    try {
    const querySnapshot = await getDocs(queryResult);
    querySnapshot.forEach((doc) => {
        const { Baby } = doc.data();
        setBabySelected(Baby.ID);
        console.log('docfinder :' + Baby.ID)
        navigation.setOptions({ headerTitle: Baby ? Baby.name : 'Suivi' })
    return BabyID
    });
    } catch (error) {
        
    }
}
  
  const images = [
    {id: 0, rq: require('./assets/biberon.png')},
    {id: 1, rq: require('./assets/diaper.png')},
    {id: 2, rq: require('./assets/medicaments.png')},
    {id: 3, rq: require('./assets/sommeil.png')},
    {id: 4, rq: require('./assets/thermo.png')},
    {id: 5, rq: require('./assets/allaitement.png')},
  ];

  const imagesDiapers = [
    {id:0, name:'Caca'},
    {id:1, name:'Pipi'},
    {id:2, name:'Caca et Pipi'},
    {id:3, name:'Sec'},
  ];


  const updateBabyTaks = async () => {
    //console.log(JSON.stringify(babyID))
    const queryResult = query(babiesRef, where('id', '==', babySelected))
    console.log('queryResult :' + babySelected)
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        //console.log(document)
        await updateDoc(doc(db, 'Baby', document.id),{
          tasks: [...document.data().tasks, {uid: uniqueId, id:selectedImage, date: time, label:label,  user:user.uid, createdBy: userInfo.username, comment:note}], 
        }).then(() => {
          console.log('success')
        });
      })

      navigation.navigate('BabyList')

    } catch (error) {
      console.error('Error updating document:', error);
    }
  }


  const handleDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
      setTime(moment(date).format('YYYY-MM-DD HH:mm:ss'));
    }
    setShowPicker(false);
  };

  const handleCategorie = (id) => {
    if(id == 0){
      //biberon
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
            placeholder='Mililitres'
        />
      
      )
    } else if(id == 1){
      //diaper
      return (
      <View  style={{flexDirection: 'row', alignItems:'center'}}>
      {imagesDiapers.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedItem(index)
                      setLabel(image.name)
                    }}
                    style={[selectedItem == image.id ? styles.imageSelected : styles.imageNonSelected]}
                  >
                    <Text>
                     {image.name}
                    </Text>
                  </TouchableOpacity>
                ))}
    </View>
      )
      
    } else if(id == 2){
      //medicament
      return (
          <TextInput
              style={styles.input}
              keyboardType='default'
              onChangeText={(inputText) => setLabel(inputText)}
              value={label}
              returnKeyLabel='Done' 
              returnKeyType='done' 
              onSubmitEditing={Keyboard.dismiss}
              maxLength={10}
              placeholder='Medicaments'
          />
        )
      
    } else if(id == 3){
      //sommeil
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
              placeholder='Temps de sommeil (min)'
          />
        )
      
    } else if(id ==4){
      //thermo
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
              placeholder='Température'
          />
        )
      
    } else if(id == 5){
      //allaitement
      return <Timer />
    }
  }

  return (
    <View style={{flex:1, backgroundColor:'white', alignItems:'center', paddingTop:10}}>
        {/* Image picker */}
        <View style={{flexDirection:'row'}}>
                {images.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedImage(index)
                      image.id == 1 ? setLabel('Caca') : setLabel('')
                      setSelectedItem(0)
                    }}
                    style={[selectedImage == image.id ? styles.imageSelected : styles.imageNonSelected]}
                  >
                    <Image source={image.rq} style={styles.image} />
                  </TouchableOpacity>
                ))}
        </View>

        {/* Label */}
        <View style={{paddingTop:20}}>
          {handleCategorie(selectedImage)}
        </View>

        {/* Time */}
        <View style={{paddingTop:20}}>
            <Text style={{color:'gray', paddingBottom:12}}>
                Quand ai-je effectué la tâche :
            </Text>
                  <DateTimePicker
                    value={selectedDate}
                    mode="datetime"
                    display="default"
                    onChange={handleDateChange}
                  />
        </View>
        
        {/* Notes */}
        <View style={{paddingTop:40}}>
          <TextInput
                style={styles.inputComment}
                multiline
                numberOfLines={3}
                value={note}
                placeholder="Commentaire"
                onChangeText={(inputText) => setNote(inputText)}
                maxLength={60}
              />
    
      </View>

      {/* footer */}
      <View style={{ 
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
        alignItems: 'center',
        justifyContent: 'flex-end', // Pushes the button to the bottom
        flexDirection:'column',
      }}>
        <TouchableOpacity onPress={updateBabyTaks} >
            <View style={styles.button}>
              <Text style={styles.buttonText}>Validate</Text>
            </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default CreateTask;

const styles = StyleSheet.create({

  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 55,
                height: 55,
                resizeMode: 'cover',
                borderColor: '#0074D9',
                borderWidth:5,
                borderRadius:60, 
                justifyContent:'center',
                alignItems:'center'
  },
  imageNonSelected: {
    width: 50,
                height: 50,
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
    borderColor: '#46B0FC',
    borderRadius: 8,
  },
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#46B0FC',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: 'white', // White input background
  },
  footer: {
    height: 100, // Adjust as needed
    justifyContent: 'center',
    alignItems: 'center',
    
    // Other styles for the footer
  },
  button: {
    backgroundColor: '#46B0FC', // Dark blue button background
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
});

