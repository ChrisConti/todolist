import { View, Text, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, userRef, babiesRef } from '../config';
import Card from "../Card.js";
import Settings from '../assets/settings.svg';
import Switch from '../assets/graph.svg';
import { useTranslation } from 'react-i18next';
import Stork from '../assets/parachute2.svg';
import SleepingBaby from '../assets/sleepingBaby.svg';

const BabyList = ({ navigation }) => {
  const { user, babyID, setBabyID, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(null);
  const [baby, setBaby] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [babyExist, setBabyExist] = useState(babyID ? true : false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return;
    getUserInfo();
    fetchBaby();

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('ManageBaby', { tasks })}
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
      headerTitle: t('header.suivi'),
    });
  }, [user, babySelected]);

  const fetchBaby = () => {
    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));
    const unsubscribeBaby = onSnapshot(babyQuery, (querySnapshot) => {
      const babyData = [];
      querySnapshot.forEach((doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const tasks = data.tasks.filter(task => {
            const taskDate = new Date(task.date);
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7);
            return taskDate >= fiveDaysAgo;
          });
          babyData.push({ ...data, tasks });
        } else {
          setBabyExist(false);
        }
      });
      if (babyData.length > 0) {
        setBaby(babyData[0]);
        setBabyID(babyData[0].id);
        //console.log(babyID)
        setTasks(babyData[0].tasks);
        setBabySelected(babyData[0].id);
        setBabyExist(true);
        navigation.setOptions({ headerTitle: babyData[0].name });
      } else {
        setBabyExist(false);
      }
      setLoading(false);
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
    const daysOfWeek = [t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'), t('days.friday'), t('days.saturday')];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = items.reduce((acc, item) => {
      const date = new Date(item.date);
      let dayName = daysOfWeek[date.getDay()];

      if (date.toDateString() === today.toDateString()) {
        dayName = t('days.today');
      } else if (date.toDateString() === yesterday.toDateString()) {
        dayName = t('days.yesterday');
      }

      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push(item);
      return acc;
    }, {});

    for (const day in groups) {
      groups[day].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return Object.keys(groups)
      .sort((a, b) => new Date(groups[b][0].date).getTime() - new Date(groups[a][0].date).getTime())
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  };

  const groupedState = groupByDay(tasks);
  const sections = Object.keys(groupedState).map(date => ({
    title: date,
    data: groupedState[date]
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C75B4A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop:10, backgroundColor: '#FDF1E7' }}>
      {!babyExist ? (
        <View style={{ alignSelf: 'center', paddingTop: 25 }}>
          <TouchableOpacity style={{ height: 220,  }} onPress={() => navigation.navigate('Baby')}>
            <Stork height={180} width={180} />
            <Text style={{ height: 20, marginTop: 5 }}>
              {t('noBaby')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length < 1 ? (
        <View>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('CreateTask', { babyID: babySelected })}>
            <SleepingBaby height={150} width={150} />
            <Text>
              {t('noActivity')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <View key={item.uid} >
              <Card key={item.uid} task={item} navigation={navigation} editable={true} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View>
              <Text style={styles.sectionHeader}>
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
    backgroundColor: '#F6F0EB',
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
    color: '#F6F0EB',
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
    backgroundColor: '#C75B4A',
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
    color: '#F6F0EB',
    fontWeight: 'bold',
    fontSize: 35
  },
  sectionHeader: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    marginTop: 3
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF1E7',
  },
});

export default BabyList;