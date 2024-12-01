import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import React, { useContext, useState } from 'react'
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { babiesRef, db } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';

const TaskDetail = ({ route, navigation }) => {
  
  const [idTask, setIDTask] = useState(route.params.task.uid)
  const [createdBy, setCreatedBy] = useState(route.params.task.createdBy)
  const [comment, setComment] = useState(route.params.task.comment)
  const [taskDate, setTaskDate] = useState(route.params.task.date)

  const {user, setUser, babyID, setBabyID, userInfo} = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);

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

  //console.log(images[0])

  const removeTaskFromBabyTasks = async () => { 
    try { 
      const queryResult = query(babiesRef, where('id', '==', babySelected)); 
      //console.log('Query result for babySelected:', babySelected); 
      const querySnapshot = await getDocs(queryResult); 
      const updatePromises = querySnapshot.docs.map(async (document) => { 
        const currentTasks = document.data().tasks; 
        const updatedTasks = currentTasks.filter(task => task.uid !== idTask); 
        console.log('Task removed successfully.' + updatedTasks);
        updateDoc(doc(db, 'Baby', document.id), { tasks: updatedTasks }); 
      }); 
      await Promise.all(updatePromises); 
       
      navigation.navigate('BabyList'); 
    } catch (error) { 
      console.error('Error updating document:', error); 
    } 
  };

  return (
    <View style={{ flex:1, padding:10, backgroundColor:'white'}}>
      <TextInput
                style={styles.inputComment}
                multiline
                numberOfLines={4}
                value={comment}
                placeholder="Commentaire"
                editable = {false}
              />
              <View style={{flexDirection:'row'}}>
                <Text>
                  Créé par : 
                </Text>
                <Text>
                  {createdBy}
                </Text>
              </View>
              <View style={{flexDirection:'row'}}>
                <Text>
                  En date du : 
                </Text>
                <Text>
                  {taskDate}
                </Text>
              </View>
              
        <TouchableOpacity onPress={removeTaskFromBabyTasks} >
            <View style={styles.button}>
              <Text style={styles.buttonText}>Supprimer</Text>
            </View>
        </TouchableOpacity>
      </View>
  )
}

export default TaskDetail

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