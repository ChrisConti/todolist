import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
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
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config';

export default function Statistics({ navigation }: any) {
  const { t } = useTranslation();
  const { babyID, setBabyID, userInfo }: any = useContext(AuthentificationUserContext);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);

  // Fetch tasks from Firebase
  useEffect(() => {
    if (!babyID) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, 'tasks'),
      where('babyID', '==', babyID),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: any[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ ...doc.data(), docId: doc.id });
      });
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [babyID]);

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

  function handleStatsCategory(selectedImage: number) {
    let filteredTasks = tasks.filter(task => task.id === selectedImage);
    if (!babyID) filteredTasks = [];
    
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
    <ScrollView style={{ padding: 10, backgroundColor: '#FDF1E7' }}>
      <View style={{ backgroundColor: '#FDF1E7' }}>
        
        {/* Image picker */}
        <View style={{ flexDirection: 'row', alignSelf: 'center', marginBottom: 20 }}>
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
  );
}

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
    borderColor: '#C75B4A',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNonSelected: {
    width: 50,
    height: 50,
    resizeMode: 'cover',
    borderWidth: 5,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'transparent',
  },
});
