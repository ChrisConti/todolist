import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native'
import React, { useContext, useEffect, useState,  } from 'react'
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where, } from 'firebase/firestore';
import { db, userRef, babiesRef } from './config';
import Card from "./Card.js";
import Icon from 'react-native-vector-icons'
import Settings from './assets/settings.svg';
import Switch from './assets/switch.svg';
import ListIcon from './assets/list.svg';

const BabyList = ({navigation}) => {

    const [modalVisible, setModalVisible] = useState(false);
    const {user, setUser, babyID, setBabyID, userInfo, setUserInfo} = useContext(AuthentificationUserContext);
    const [babySelected, setBabySelected] = useState(babyID);

    const [babies, setBabies] = useState([]);
    const [tasks, setTasks] = useState([]);
    const groupedData = {};

    const queryResult = query(userRef, where('userId', '==', user.uid));
    //const queryResult2 = query(babiesRef, where('id', '==', user.uid));

    useEffect(()=> {
    if(!user) return
      //getInfo from the user and save it for
       getUserInfo(queryResult)
       getBabyInfo()

        // Get the baby from the current user
        navigation.setOptions({
          headerRight: () => (
              <TouchableOpacity 
              onPress={() => {
                navigation.navigate('ManageBaby')
              }} 
              style={{marginRight:15}}>
                <Switch height={30} width={30} />
              </TouchableOpacity>
            ),
          headerLeft: () => (
              <TouchableOpacity onPress={() => {
                navigation.navigate('Settings')
              }} 
              style={{marginLeft:15}}>
                <Settings height={30} width={30} />
              </TouchableOpacity>
            ),
            headerTitle: 'Suivi',
      });
      return () => {
        getBabyInfo();
      };
      },[]) 

      const getBabyInfo = onSnapshot(babiesRef, (querySnapshot) => {
        console.log('getBabyInfo')
        console.log(babyID) 
        const newEntities = []
        // Handle changes here
        querySnapshot.forEach((doc) => {
          // Access individual document data
          const babyData = doc.data();
          //console.log(babyID)
            if(babyData.id === babyID){
                newEntities.push(babyData);
                navigation.setOptions({ headerTitle: babyData.name })
                //console.log('baby found : ' + newEntities[0].tasks)
                console.log('baby found')
                setBabies(newEntities)
        
                newEntities.length > 0 ? setTasks(newEntities[0].tasks) : ''
            }
        });
        
        
        //return newEntities
      });

        async function getUserInfo(queryResult) {
          console.log('getUserInfo')
            // get from the user his baby favorite to display it first on home
            try {
            const querySnapshot = await getDocs(queryResult);
            querySnapshot.forEach((doc) => {
                const { Baby } = doc.data();
                const userInfoQuery = doc.data();
                setUserInfo(userInfoQuery)
                //console.log(userInfoQuery)
                //console.log(userInfo)
                setBabySelected(Baby.ID);
                
                Baby.ID ? navigation.setOptions({ headerTitle: Baby.name }) :''
                setBabyID(Baby.ID)
            return BabyID
            });
            } catch (error) {
                
            }
        }

    // *******************  tasks sorted and more

      //***********
      const groupByDay = (items) => {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
      
        return items.reduce((groups, item) => {
          const date = new Date(item.date);
          let dayName = daysOfWeek[date.getDay()];
      
          if (date.toDateString() === today.toDateString()) {
            dayName = 'Today';
          } else if (date.toDateString() === yesterday.toDateString()) {
            dayName = 'Yesterday';
          }
      
          if (!groups[dayName]) {
            groups[dayName] = [];
          }
          groups[dayName].push(item);
          return groups;
        }, {});
      };

      const groupedState = groupByDay(tasks);
      const sections = Object.keys(groupedState).map(date => ({
        title: date,
        data: groupedState[date]
      }));

      //***************** get the tasks for the baby selected ref */


  return (
    <View style={{flex:1, backgroundColor:'white'}}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
        {babies.length < 1 ?
            <View style={{alignSelf:'center', paddingTop:25}}>
            <TouchableOpacity style={{height:20, width:150, }} onPress={()=> navigation.navigate('Baby')}>
              <Image source={require('./assets/baby.png')} style={{}} />
              <Text style={{height:20, marginTop:5}}>
                No baby yet ? Clic here !
              </Text>
            </TouchableOpacity>
          </View>
        : tasks.length < 1 ? 
        <View >
          <TouchableOpacity style={{alignItems:'center'}} onPress={()=> navigation.navigate('CreateTask', {babyID : babySelected})}>
          <ListIcon height={90} width={90} />
            <Text>
              No activity yet ? Clic here !
            </Text>
          </TouchableOpacity>
        </View>
         :  ''
        }


<SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Card key={item.uid} task={item} navigation={navigation}/>
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View>
            <Text style={{ 
            color: 'black', // White text color
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom:5,
            marginTop:3
          }}
          >{title}</Text>
          </View>
        )}
      />
        
      </ScrollView>
      {babies.length > 0 ?
      <View style={styles.footer}>
      <TouchableOpacity onPress={() => {
        navigation.navigate('CreateTask', {babyID})
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