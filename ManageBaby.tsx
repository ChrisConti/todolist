import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native'
import React, { useContext, useEffect, useState,  } from 'react'
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where, } from 'firebase/firestore';
import { db, userRef, babiesRef } from './config';
import moment from 'moment';

const ManageBaby = () => {
  const [taskCounts, setTaskCounts] = useState({
    today: {},
    lastSevenDays: {},
    lastThirtyDays: {},
  });
  const images = [
    {id: 0, rq: require('./assets/biberon.png')},
    {id: 1, rq: require('./assets/diaper.png')},
    {id: 2, rq: require('./assets/medicaments.png')},
    {id: 3, rq: require('./assets/sommeil.png')},
    {id: 4, rq: require('./assets/thermo.png')},
    {id: 5, rq: require('./assets/allaitement.png')},
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const tasksRef = collection(db, 'Baby');
    const querySnapshot = await getDocs(tasksRef);
    
    let todayCounts = {};
    let lastSevenDaysCounts = {};
    let lastThirtyDaysCounts = {};

    querySnapshot.forEach((doc) => {
      const tasks = doc.data().tasks;

      tasks.forEach((task) => {
        const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
        const taskType = task.id; // Assuming tasks have a 'type' field

        if (taskDate.isSame(moment(), 'day')) {
          todayCounts[taskType] = (todayCounts[taskType] || 0) + 1;
        }
        if (taskDate.isAfter(moment().subtract(7, 'days'))) {
          lastSevenDaysCounts[taskType] = (lastSevenDaysCounts[taskType] || 0) + 1;
        }
        if (taskDate.isAfter(moment().subtract(30, 'days'))) {
          lastThirtyDaysCounts[taskType] = (lastThirtyDaysCounts[taskType] || 0) + 1;
        }
      });
    });

    setTaskCounts({
      today: todayCounts,
      lastSevenDays: lastSevenDaysCounts,
      lastThirtyDays: lastThirtyDaysCounts,
    });
  };

  const renderTaskCounts = (counts) => {
    return Object.entries(counts).map(([type, count]) => (
      <View style={{flexDirection:'row', padding:10, alignItems:'center', justifyContent:'space-evenly'}}>
        <Image source={images[type].rq} style={styles.image} />
        <Text key={type} style={{fontSize:30, color:'#46B0FC', paddingLeft:20}}>{String(count)}</Text>
      </View>
      
    ));
  };

  return (
    <ScrollView style={{flex:1, padding: 20, backgroundColor:'white'}}>
    <View style={{flex:1, padding: 20, backgroundColor:'white', justifyContent:'space-evenly' }}>
      <View>
        <Text style={styles.titleParameter}>Tasks Done Today:</Text>
        {renderTaskCounts(taskCounts.today)}
      </View>
      
    <View>
      <Text style={styles.titleParameter}>Tasks Done in Last 7 Days:</Text>
      {renderTaskCounts(taskCounts.lastSevenDays)}
    </View>
      
    <View>
      <Text style={styles.titleParameter}>Tasks Done in Last 30 Days:</Text>
      {renderTaskCounts(taskCounts.lastThirtyDays)}
    </View>
      
    </View>
    </ScrollView>
  );
};

export default ManageBaby;

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
  titleParameter:{
    color: '#7A8889', // White text color
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom:5,
    marginTop:3
},
});
