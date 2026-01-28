import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native';
import React, { useContext, useEffect, useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import BiberonComponent from '../stats/Biberon';
import DiaperComponent from '../stats/Diaper';
import SommeilComponent from '../stats/Sommeil';
import ThermoComponent from '../stats/Thermo';
import AllaitementComponent from '../stats/Allaitement';
import Allaitement from '../assets/allaitement-color.svg';
import Thermo from '../assets/thermo-color.svg';
import Dodo from '../assets/dodo-color.svg';
import Couche from '../assets/couche-color.svg';
import Sante from '../assets/sante-color.svg';
import Biberon from '../assets/biberon-color.svg';
import { onSnapshot, query, where } from 'firebase/firestore';
import { babiesRef } from '../config';

export default function Statistics({ navigation }: any) {
  const { t } = useTranslation();
  const { user, babyID, setBabyID, userInfo }: any = useContext(AuthentificationUserContext);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksVersion, setTasksVersion] = useState(0);

  // Fetch tasks from Firebase - optimized to last 90 days only
  useEffect(() => {
    if (!user || !babyID) {
      setTasks([]);
      return;
    }

    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(
      babyQuery,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const babyData = querySnapshot.docs[0]?.data();
          if (babyData && babyData.id === babyID) {
            // Performance optimization: Only keep tasks from last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentTasks = (babyData.tasks || []).filter((task: any) => {
              const taskDate = new Date(task.date);
              return taskDate >= sevenDaysAgo;
            });

            setTasks(recentTasks);
            setTasksVersion(v => v + 1); // Force refresh
          } else {
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
      },
      (error) => {
        console.error('Error fetching baby data:', error);
        setTasks([]);
      }
    );

    return () => unsubscribe();
  }, [babyID, user]);

  const images = [
    { id: 0, rq: require('../assets/biberon.png') },
    { id: 1, rq: require('../assets/diaper.png') },
    { id: 3, rq: require('../assets/sommeil.png') },
    { id: 4, rq: require('../assets/thermo.png') },
    { id: 5, rq: require('../assets/allaitement.png') },
  ];

  const handleImageType = (id: number) => {
    if (id == 0) return <Biberon height={45} width={45} />;
    if (id == 1) return <Couche height={35} width={35} />;
    if (id == 2) return <Sante height={35} width={35} />;
    if (id == 3) return <Dodo height={35} width={35} />;
    if (id == 4) return <Thermo height={35} width={35} />;
    if (id == 5) return <Allaitement height={35} width={35} />;
  };

  // Memoize filtered tasks to ensure stats refresh properly
  const filteredTasks = useMemo(() => {
    if (!babyID) return [];
    return tasks.filter(task => task.id === selectedImage);
  }, [tasks, selectedImage, babyID, tasksVersion]);

  function handleStatsCategory(selectedImage: number) {
    switch (selectedImage) {
      case 0:
        return <BiberonComponent tasks={filteredTasks} navigation={navigation} />;
      case 1:
        return <DiaperComponent tasks={filteredTasks} navigation={navigation} />;
      case 3:
        return <SommeilComponent tasks={filteredTasks} navigation={navigation} />;
      case 4:
        return <ThermoComponent tasks={filteredTasks} navigation={navigation} />;
      case 5:
        return <AllaitementComponent tasks={filteredTasks} navigation={navigation} />;
      default:
        return null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FDF1E7' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('title.stats') || 'Statistiques'}</Text>
        {tasks.length > 0 && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => navigation.navigate('ExportTasks')}
          >
            <MaterialCommunityIcons name="file-download" size={28} color="#F6F0EB" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={{ padding: 10, backgroundColor: '#FDF1E7' }}>
        <View style={{ backgroundColor: '#FDF1E7' }}>
          
          {/* Image picker */}
          <View style={{ flexDirection: 'row', alignSelf: 'center', marginBottom: 20, gap: 12 }}>
            {images.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setSelectedImage(image.id);
                }}
                style={[selectedImage == image.id ? styles.imageSelected : styles.imageNonSelected]}
              >
                {handleImageType(image.id)}
              </TouchableOpacity>
            ))}
          </View>
          <View>
            {handleStatsCategory(selectedImage)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#C75B4A',
    paddingTop: 50,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F6F0EB',
    fontFamily: 'Pacifico',
    textAlign: 'center',
  },
  exportButton: {
    position: 'absolute',
    right: 15,
    top: 50,
    padding: 8,
  },
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    borderColor: '#C75B4A',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
