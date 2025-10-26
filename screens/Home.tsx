import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator } from 'react-native';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { babiesRef, userRef } from '../config';
import { useTranslation } from 'react-i18next';
import Card from "../Card.js";
import Stork from '../assets/parachute2.svg';
import SleepingBaby from '../assets/sleepingBaby.svg';
import Settings from '../assets/settings.svg';
import Graph from '../assets/graph.svg';
import analytics from '../services/analytics';

const BabyList = ({ navigation }) => {
  const { user, babyID, setBabyID, userInfo, setUserInfo, setUsersList } = useContext(AuthentificationUserContext);
  const snapshotListener = useRef<(() => void) | null>(null);
  const [tasks, setTasks] = useState([]);
  const [babyName, setBabyName] = useState('');
  const [babyExist, setBabyExist] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    // Track screen view
    analytics.logScreenView('Home');
    
    if (!user) return;

    setLoading(true);

    // Fetch user info if not already available
    if (!userInfo) fetchUserInfo();

    // Unsubscribe from previous listener if it exists
    if (snapshotListener.current) snapshotListener.current();

    // Set up a new listener for baby data
    snapshotListener.current = fetchBabyData();

    // Set navigation options
    updateNavigationOptions();

    return () => {
      if (snapshotListener.current) snapshotListener.current(); // Cleanup listener
    };
  }, [babyID]);

  const fetchBabyData = () => {
    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));

    return onSnapshot(
      babyQuery,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          handleNoBabyFound();
        } else {
          handleBabyFound(querySnapshot);
        }
        setLoading(false); // Ensure loading stops after fetching data
      },
      (error) => {
        console.error('Error fetching baby data:', error);
        setLoading(false); // Ensure loading stops even if there's an error
      }
    );
  };

  const handleNoBabyFound = () => {
    setBabyID(null);
    setBabyExist(false);
    setBabyName(t('title.following'));
    setTasks([]);
    navigation.setOptions({ headerTitle: t('title.following') });
  };

  const handleBabyFound = (querySnapshot) => {
    const babyData = querySnapshot.docs[0]?.data();

    if (babyData) {
      setBabyExist(true);
      setBabyName(babyData.name);
      setBabyID(babyData.id);
      setUsersList(babyData.user);

      // Filter tasks from the last 7 days
      const recentTasks = babyData.tasks?.filter((task) => {
        const taskDate = new Date(task.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return taskDate >= sevenDaysAgo;
      }) || [];

      setTasks(recentTasks);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const userQuery = query(userRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(userQuery);

      querySnapshot.forEach((doc) => {
        setUserInfo(doc.data());
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const updateNavigationOptions = () => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.headerButton, { left: 15 }]}>
            <Settings width={22} height={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{babyName || t('title.following')}</Text>
          {babyExist && (
            <TouchableOpacity onPress={() => navigation.navigate('ManageBaby', { tasks })} style={[styles.headerButton, { right: 15 }]}>
              <Graph width={22} height={22} />
            </TouchableOpacity>
          )}
        </View>
      ),
      headerLeft: () => null,
      headerRight: () => null,
    });
  };

  const groupTasksByDay = (tasks) => {
    const daysOfWeek = [t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'), t('days.friday'), t('days.saturday')];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    const groupedTasks = tasks.reduce((acc, task) => {
      const taskDate = new Date(task.date);
      let dayLabel = daysOfWeek[taskDate.getDay()];
  
      if (taskDate.toDateString() === today.toDateString()) {
        dayLabel = t('days.today');
      } else if (taskDate.toDateString() === yesterday.toDateString()) {
        dayLabel = t('days.yesterday');
      }
  
      if (!acc[dayLabel]) acc[dayLabel] = [];
      acc[dayLabel].push(task);
      return acc;
    }, {});
  
    // Sort tasks within each day by time in descending order
    Object.keys(groupedTasks).forEach((key) => {
      groupedTasks[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  
    return Object.keys(groupedTasks)
      .sort((a, b) => new Date(groupedTasks[b][0].date) - new Date(groupedTasks[a][0].date))
      .map((key) => ({ title: key, data: groupedTasks[key] }));
  };

  const sections = groupTasksByDay(tasks);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.headerButton, { left: 15 }]}>
          <Settings width={22} height={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{babyName || t('title.following')}</Text>
        {babyExist && (
          <TouchableOpacity onPress={() => navigation.navigate('ManageBaby', { tasks })} style={[styles.headerButton, { right: 15 }]}>
            <Graph width={22} height={22} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C75B4A" />
        </View>
      ) : !babyExist ? (
        <EmptyState
          icon={<Stork height={180} width={180} />}
          message={t('noBabyFound')}
          actions={[
            { label: t('title.addBaby'), onPress: () => navigation.navigate('Baby') },
            { label: t('settings.joinBaby'), onPress: () => navigation.navigate('JoinBaby') },
          ]}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<SleepingBaby height={150} width={150} />}
          message={t('noTasksFound')}
          actions={[
            { label: t('task.addTask'), onPress: () => navigation.navigate('CreateTask', { babyID }) },
          ]}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => <Card task={item} navigation={navigation} editable />}
          renderSectionHeader={({ section: { title } }) => (
            <View>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
        />
      )}

      {babyExist && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateTask', { babyID })} style={styles.floatingButton}>
            <Text style={styles.floatingButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const EmptyState = ({ icon, message, actions }) => (
  <View style={{ alignSelf: 'center', paddingTop: 25 }}>
    <View style={{ alignItems: 'center' }}>{icon}</View>
    <View style={{ height: 20 }} />
    {actions.map((action, index) => (
      <TouchableOpacity key={index} onPress={action.onPress}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F0EB' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    backgroundColor: '#C75B4A', 
    paddingTop: 45,
    position: 'relative',
  },
  headerButton: {
    padding: 5,
    position: 'absolute',
    top: 45,
    zIndex: 1,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#F6F0EB', 
    fontFamily: 'Pacifico',
    textAlign: 'center',
    flex: 1,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF1E7' },
  sectionHeader: { color: '#7A8889', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 3 },
  footer: { position: 'absolute', bottom: 40, right: 30 },
  floatingButton: { backgroundColor: '#C75B4A', width: 70, height: 70, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  floatingButtonText: { color: '#F6F0EB', fontWeight: 'bold', fontSize: 35 },
  button: { backgroundColor: '#C75B4A', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, width: 300 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default BabyList;
