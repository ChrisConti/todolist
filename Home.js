import { View, Text, TouchableOpacity, StyleSheet, Image, SectionList } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, userRef, babiesRef } from './config';
import Card from "./Card.js";
import Settings from './assets/settings.svg';
import Switch from './assets/switch.svg';
import ListIcon from './assets/list.svg';

const BabyList = ({ navigation }) => {
  const { user, babyID, setBabyID, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(null);
  const [baby, setBaby] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [babyExist, setBabyExist] = useState(babyID ? true : false);

  useEffect(() => {
    if (!user) return;
    console.log(babyID)
    getUserInfo();
    fetchBaby();

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('ManageBaby')}
          style={{ marginRight: 15 }}
        >
          <Switch height={30} width={30} />
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={{ marginLeft: 15 }}
        >
          <Settings height={30} width={30} />
        </TouchableOpacity>
      ),
      headerTitle: 'Suivi',
    });
  }, [user, babySelected]);

  const fetchBaby = () => {
    //console.log('fetchBaby')
    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));
    //console.log(babyQuery)
    const unsubscribeBaby = onSnapshot(babyQuery, (querySnapshot) => {
      const babyData = [];
      querySnapshot.forEach((doc) => {
        if (doc.exists()) {
          //console.log('docexist')
          const data = doc.data();
          babyData.push(data);
          //console.log('user : ' + babyData[0].user)
        } else {
          setBabyExist(false)
        }
      });
      if (babyData.length > 0) {
        setBaby(babyData[0]);
        setBabyID(babyData[0].id)
        //console.log(babyData[0].id)
        setTasks(babyData[0].tasks);
        setBabySelected(babyData[0].id);
        setBabyExist(true)
        navigation.setOptions({ headerTitle: babyData[0].name });
      } else {
        //console.log("no baby")
        setBabyExist(false)
      }
    });
    return unsubscribeBaby;
  };

  const getUserInfo = async () => {
    const queryResult = query(userRef, where('userId', '==', user.uid));
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach((doc) => {
        const userInfoQuery = doc.data();
        setUserInfo(userInfoQuery);
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {!babyExist ? (
        <View style={{ alignSelf: 'center', paddingTop: 25 }}>
          <TouchableOpacity style={{ height: 20, width: 150 }} onPress={() => navigation.navigate('Baby')}>
            <Image source={require('./assets/baby.png')} style={{}} />
            <Text style={{ height: 20, marginTop: 5 }}>
              No baby yet? Click here!
            </Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length < 1 ? (
        <View>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('CreateTask', { babyID: babySelected })}>
            <ListIcon height={90} width={90} />
            <Text>
              No activity yet? Click here!
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <View key={item.uid} >
              <Card key={item.uid} task={item} navigation={navigation} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View>
              <Text style={{
                color: 'black',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 5,
                marginTop: 3
              }}>
                {title}
              </Text>
            </View>
          )}
        />
      )}
      {baby && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateTask', { babyID })} style={styles.floatingButton}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

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
    justifyContent: 'center'
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
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexDirection: 'column'
  },
  floatingButton: {
    backgroundColor: '#46B0FC',
    borderWidth: 1,
    borderColor: 'white',
    width: 70,
    height: 70,
    padding: 10,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
    marginBottom: 40
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 35
  },
});

export default BabyList;
