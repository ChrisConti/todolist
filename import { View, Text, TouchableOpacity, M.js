import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image } from 'react-native'
import React, { useContext, useEffect, useState,  } from 'react'
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where, } from 'firebase/firestore';
import { db, userRef, babiesRef } from './config';
import Card from "./Card.js";
import Icon from 'react-native-vector-icons'
import Settings from './assets/settings.svg';
import Switch from './assets/switch.svg';

const BabyList = ({navigation}) => {

    const [modalVisible, setModalVisible] = useState(false);
    const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);
    const [babySelected, setBabySelected] = useState(babyID);

    const [babies, setBabies] = useState([]);
    const [tasks, setTasks] = useState([]);
    const groupedData = {};

    const queryResult = query(userRef, where('userId', '==', user.uid));
    //const queryResult2 = query(babiesRef, where('id', '==', user.uid));

    useEffect(()=> {
    if(!user) return
       DocFinder(queryResult)

        // Get the babies from the current user
          const getBabies = onSnapshot(babiesRef, (querySnapshot) => {
            console.log('snapshot baby')
            const newEntities = []
            // Handle changes here
            querySnapshot.forEach((doc) => {
              // Access individual document data
              const babyData = doc.data();
              if (babyData.user.includes(user.uid)) {
                console.log('snapshot baby 2')
                if(babyData.uid === babySelected){
                    navigation.setOptions({ headerTitle: babyData.name })
                }
                newEntities.push(babyData);
              }
            });
            setBabies(newEntities)
            console.log('snapshot baby 3')
            //getTasksFromBabySelected(babySelected)
          });

        navigation.setOptions({
          headerRight: () => (
              <TouchableOpacity 
              onPress={() => {
                setModalVisible(true)
              }} 
              style={{marginRight:15}}>
                <Switch height={30} width={30} />
              </TouchableOpacity>
            ),
          headerLeft: () => (
              <TouchableOpacity onPress={() => {
                navigation.navigate('HomeScreen')
              }} 
              style={{marginLeft:15}}>
                <Settings height={30} width={30} />
              </TouchableOpacity>
            ),
            headerTitle: 'Suivi',
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
                navigation.setOptions({ headerTitle: Baby ? Baby.name : 'Suivi' })
            return BabyID
            });
            } catch (error) {
                
            }
        }

    // *******************  tasks sorted and more
    const affineTasks = (tasks) => {
        // first sorting
        tasks.sort((a, b) => {
            const dateTimeA = new Date(a.date).valueOf();
            const dateTimeB = new Date(b.date).valueOf();  
            // Sort in ascending order (use -1 for descending order)
            return dateTimeB - dateTimeA;
        });
        tasks.forEach((item) => {
            const day = item.date ? item.date.split(' ')[0] : 33;
            if (!groupedData[day]) {
              groupedData[day] = [];
            }
            groupedData[day].push(item);
        }) 
        return tasks
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

      //*********** update the babies reference for the display and get the tasks */
      const updateBabyID = async (p0: string) => {
        const queryResult = query(userRef, where('userId', '==', user.uid))
        try {
          const querySnapshot = await getDocs(queryResult);
          querySnapshot.forEach(async (document) => {
            await updateDoc(doc(db, 'Users', document.id),{
              BabyID: p0,
            }).then(() => {
              console.log('User updated with babyID selected : ' + p0)
            });
          })
    
        } catch (error) {
          //console.error('Error updating document:', error);
        }
      }

      //***************** get the tasks for the baby selected ref */
      const getTasksFromBabySelected = (BabyID) => {
        var tasksList = []
        babies.map((item) => {
          console.log(item.id + ' ' + BabyID)
          if(item.id === BabyID){
            tasksList = item.tasks
          } else {
          }
      })
        affineTasks(tasksList)
      }
      getTasksFromBabySelected(babySelected)
  return (
    <View style={{flex:1, backgroundColor:'white'}}>
      <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => { setModalVisible(!modalVisible); }}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text>Choose a baby</Text>
              {babies.map((item) => (
              <TouchableOpacity onPress={() => { 
                //console.log(item)
                setBabySelected(item.id)
                setBabyID(item.id) 
                console.log('babyID  ****** ' + item.id)
                //updateBabyID(item.id)
                //getTasksFromBabySelected(item.id)
                navigation.setOptions({ headerTitle: item.name })
              }}
              key={item.id}
              style={{
                backgroundColor:'green',
                borderBottomColor:"white",
                marginBottom:10
              }}>
                <Text>{item.name}</Text>
              </TouchableOpacity>
            ))}
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setModalVisible(!modalVisible)}>
                <Text style={styles.textStyle}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: 'white',
    },
    task: {
      fontSize: 18,
      marginBottom: 8,
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },
    modalView: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 80,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      justifyContent:'center'
    },
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: '#F194FF',
    },
    buttonClose: {
      backgroundColor: '#2196F3',
    },
    textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    modalText: {
      marginBottom: 15,
      textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
        alignItems: 'flex-end',
        justifyContent: 'flex-end', // Pushes the button to the bottom
        flexDirection:'column'
      },
      floatingButton: {
        backgroundColor: '#46B0FC',
        borderWidth:1,
        borderColor:'white',
        width:70,
        height:70,
        padding: 10,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight:30,
        marginBottom:40
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize:35
      },
  });

export default BabyList