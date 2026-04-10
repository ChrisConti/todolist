import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native';
import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import AllComponent from '../stats/All';
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
  const insets = useSafeAreaInsets();
  const { user, babyID, setBabyID, userInfo }: any = useContext(AuthentificationUserContext);
  const [selectedImage, setSelectedImage] = useState<number | 'all'>('all');
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
    { id: 'all' as const },
    { id: 0, rq: require('../assets/biberon.png') },
    { id: 1, rq: require('../assets/diaper.png') },
    { id: 3, rq: require('../assets/sommeil.png') },
    { id: 4, rq: require('../assets/thermo.png') },
    { id: 5, rq: require('../assets/allaitement.png') },
  ];

  const handleImageType = (id: number | 'all') => {
    const iconSize = 30;
    if (id === 'all') return <MaterialCommunityIcons name="chart-box-multiple-outline" size={iconSize} color="#C75B4A" />;
    if (id == 0) return <Biberon height={iconSize} width={iconSize} />;
    if (id == 1) return <Couche height={iconSize} width={iconSize} />;
    if (id == 2) return <Sante height={iconSize} width={iconSize} />;
    if (id == 3) return <Dodo height={iconSize} width={iconSize} />;
    if (id == 4) return <Thermo height={iconSize} width={iconSize} />;
    if (id == 5) return <Allaitement height={iconSize} width={iconSize} />;
  };

  // Memoize filtered tasks to ensure stats refresh properly
  const filteredTasks = useMemo(() => {
    if (!babyID) return [];
    if (selectedImage === 'all') return tasks; // Return all tasks for "All" view
    return tasks.filter(task => task.id === selectedImage);
  }, [tasks, selectedImage, babyID, tasksVersion]);

  function handleStatsCategory(selectedImage: number | 'all') {
    if (selectedImage === 'all') {
      return <AllComponent tasks={tasks} navigation={navigation} />;
    }
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Category selector in header */}
        <View style={styles.headerCategorySelector}>
          {images.map((image, index) => {
            const isSelected = selectedImage === image.id;
            return (
              <TouchableOpacity
                key={`cat-${image.id}`}
                onPress={() => {
                  setSelectedImage(image.id);
                }}
                style={[isSelected ? styles.categoryIconSelected : styles.categoryIconNonSelected]}
              >
                {handleImageType(image.id)}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView style={{ padding: 10, backgroundColor: '#FDF1E7' }}>
        <View style={{ backgroundColor: '#FDF1E7' }}>
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
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#C75B4A',
  },
  headerCategorySelector: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  categoryIconSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    borderColor: '#F6F0EB',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconNonSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
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
