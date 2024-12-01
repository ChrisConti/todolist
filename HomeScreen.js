import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image } from 'react-native'
import React, { useContext, useEffect, useState,  } from 'react'
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where, } from 'firebase/firestore';
import { db, userRef, babiesRef } from './config';
import Card from "./Card.js";
import Icon from 'react-native-vector-icons'
import Settings from './assets/settings.svg';
import Switch from './assets/switch.svg';

const HomeScreen = ({ navigation }) => {

    //Get the current user
    const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);
    const [babySelected, setBabySelected] = useState(babyID);

    const [babies, setBabies] = useState([]);
    const [tasks, setTasks] = useState([]);
    const groupedData = {};

    const queryResult = query(userRef, where('userId', '==', user.uid));

  useEffect(()=>{
    DocFinder(queryResult)
    console.log('**************************')

    // Get the babies from the current user
    const getBabies = onSnapshot(babiesRef, (querySnapshot) => {
      const newEntities = []
      // Handle changes here
      querySnapshot.forEach((doc) => {
        // Access individual document data
        const babyData = doc.data();
        if (babyData.user.includes(user.uid)) {
          newEntities.push(babyData);
        }
      });
      setBabies(newEntities)
      console.log('new : ' + newEntities)
      setTasks(newEntities)
    });

    return () => {
      getBabies();
    };

  },[])

  async function DocFinder(queryResult) {
    // get from the user his baby favorite to display it first on home
    try {
    const querySnapshot = await getDocs(queryResult);
    querySnapshot.forEach((doc) => {
        const { Baby } = doc.data();
        setBabySelected(Baby.ID);
        //navigation.setOptions({ headerTitle: Baby ? Baby.name : 'Suivi' })
    return BabyID
    });
    } catch (error) {
        
    }
}

  //***************** get the tasks for the baby ref sorted */
  const getTasksFromBabySelected = (BabyID) => {
    var tasksList = []
    babies.map((item) => {
      console.log(item.id + ' ' + BabyID)
      if(item.id === BabyID){
        tasksList = item.tasks
      } else {
      }
    })

  tasksList.sort((a, b) => {
      const dateTimeA = new Date(a.date).valueOf();
      const dateTimeB = new Date(b.date).valueOf();  
      // Sort in ascending order (use -1 for descending order)
      return dateTimeB - dateTimeA;
  });
  tasksList.forEach((item) => {
      const day = item.date ? item.date.split(' ')[0] : 33;
      if (!groupedData[day]) {
        groupedData[day] = [];
      }
      groupedData[day].push(item);
  }) 

    //affineTasks(tasksList)
  }
  const getDayName = (dateStr) => {
    const currentDate = new Date().toISOString().slice(0, 10);
    const inputDate = new Date(dateStr).toISOString().slice(0, 10);
    const inputDateObj = new Date(inputDate);
  
    if (inputDate === currentDate) {
      return 'Today';
  } else {
      // Calculate the previous day's date
      const prevDateObj = new Date(currentDate);
      prevDateObj.setDate(prevDateObj.getDate() - 1);

      if (inputDateObj.toISOString().slice(0, 10) === prevDateObj.toISOString().slice(0, 10)) {
          return 'Yesterday';
      } else {
          return inputDateObj.toLocaleDateString('en-US', { weekday: 'long' });
      }
  }
  };


  getTasksFromBabySelected(babySelected)


  /*return (
    <View>
      <View style={styles.header}>
        <Text>
          {babies.length}
        </Text>
        
      </View>
      <View style={styles.body}>

      </View>
      <View style={styles.bottom}>

      </View>

    </View>

  );*/


  return (
    <View style={{flex:1, backgroundColor:'white', marginTop:70}}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
        {babies.length < 1 ?
            <View style={{alignSelf:'center', paddingTop:25}}>
            <TouchableOpacity style={{height:20, width:150, }} onPress={()=> navigation.navigate('Baby')}>
              <Image source={require('./assets/baby.png')} style={{}} />
              <Text style={{height:20, marginTop:5}}>
                No baby yet ? Clic here !
              </Text>
            </TouchableOpacity>
            <Text>{babySelected}</Text>
          </View>
        : Object.keys(groupedData).length < 1 ? 
        <View>
          <TouchableOpacity style={{height:20, width:100, borderWidth:3, borderColor:'blue', backgroundColor:'blue'}} onPress={()=> navigation.navigate('CreateTask', {babyID : babySelected})}>
            <Text>
              No activity yet ? Clic here !
            </Text>
          </TouchableOpacity>
          <Text>{babySelected}</Text>
        </View>
         : ''
        }
        
      {Object.keys(groupedData).map((day) => (
        <View key={day}>
          <Text style={{ 
            color: 'black', // White text color
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom:5,
            marginTop:3
          }}
          key={day}
          >{getDayName(day)}</Text>
          {
          groupedData[day].map((item) => (<Card key={item.uid} task={item}/>))
          }
          
        </View>
      ))}
      </ScrollView>
      {babies.length > 0 ?
      <View style={styles.footer}>
      <TouchableOpacity onPress={() => {
        navigation.navigate('CreateTask', {babyID : babySelected})
      }} style={styles.floatingButton}>
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
    : '' 
    }
  
    </View>
  )




};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  header: {
    height:35,
    paddingTop : 20,
    backgroundColor:'red',
    marginTop : 60
  },
  body : {},
  footer : {
    paddingBottom : 80
  }
})

export default HomeScreen;
