import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, SectionList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { userRef, babiesRef } from './config';
import Card from "./Card.js";
import Settings from './assets/settings.svg';
import Switch from './assets/switch.svg';
import ListIcon from './assets/list.svg';

const BabyList = ({ navigation, tasks }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { user, babyID, setBabyID, setUserInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);
  const [babies, setBabies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const { t } = useTranslation(); // Use the translation hook

  const queryResult = query(userRef, where('userId', '==', user.uid));

  useEffect(() => {
    if (!user) return;
    getUserInfo(queryResult);
    getBabyInfo();

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('ManageBaby')} style={{ marginRight: 15 }}>
          <Switch height={30} width={30} />
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginLeft: 15 }}>
          <Settings height={30} width={30} />
        </TouchableOpacity>
      ),
      headerTitle: t('header.suivi'),
    });

    return () => {
      getBabyInfo();
    };
  }, []);

  const getBabyInfo = onSnapshot(babiesRef, (querySnapshot) => {
    const newEntities = [];
    querySnapshot.forEach((doc) => {
      const babyData = doc.data();
      if (babyData.id === babyID) {
        newEntities.push(babyData);
        navigation.setOptions({ headerTitle: babyData.name });
        setBabies(newEntities);
        setTasks(newEntities.length > 0 ? newEntities[0].tasks : []);
      }
    });
  });

  async function getUserInfo(queryResult) {
    const querySnapshot = await getDocs(queryResult);
    querySnapshot.forEach((doc) => {
      const { Baby } = doc.data();
      setUserInfo(doc.data());
      setBabySelected(Baby.ID);
      Baby.ID ? navigation.setOptions({ headerTitle: Baby.name }) : '';
      setBabyID(Baby.ID);
    });
  }

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
    <View style={{ flex: 1, backgroundColor: '#FDF1E7' }}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {babies.length < 1 ?
          <View style={{ alignSelf: 'center', paddingTop: 25 }}>
            <TouchableOpacity style={{ height: 20, width: 150 }} onPress={() => navigation.navigate('Baby')}>
              <Image source={require('./assets/baby.png')} />
              <Text style={{ height: 20, marginTop: 5 }}>{t('button.no_baby')}</Text>
            </TouchableOpacity>
          </View>
          : tasks.length < 1 ?
            <View>
              <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('CreateTask', { babyID: babySelected })}>
                <ListIcon height={90} width={90} />
                <Text>{t('button.no_activity')}</Text>
              </TouchableOpacity>
            </View>
            : null
        }

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <Card key={item.uid} task={item} navigation={navigation} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
        />
      </ScrollView>
      {babies.length > 0 && (
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
  contentContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    marginTop: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    flexDirection: 'column',
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
    marginBottom: 40,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 35,
  },
});

export default BabyList;
