import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView, Image, SectionList } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import BiberonComponent from './stats/Biberon';
import DiaperComponent from './stats/Diaper';
import SommeilComponent from './stats/Sommeil';
import ThermoComponent from './stats/Thermo';
import AllaitementComponent from './stats/Allaitement';
import Allaitement from './assets/allaitement-color.svg';
import Thermo from './assets/thermo-color.svg';
import Dodo from './assets/dodo-color.svg';
import Couche from './assets/couche-color.svg';
import Sante from './assets/sante-color.svg';
import Biberon from './assets/biberon-color.svg';

const ManageBaby = ({ navigation, route }) => {
  const [tasks, setTasks] = useState(route.params.tasks);
  //const { tasks } = ;
  //console.log('tasks manage baby', route.params.tasks);
  const { t } = useTranslation();
  const { babyID, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const [selectedImage, setSelectedImage] = useState(0);
  //console.log(route.params.getTasks());
 
  const images = [
    { id: 0, rq: require('./assets/biberon.png') },
    { id: 1, rq: require('./assets/diaper.png') },
    { id: 3, rq: require('./assets/sommeil.png') },
    { id: 4, rq: require('./assets/thermo.png') },
    { id: 5, rq: require('./assets/allaitement.png') },
  ];

   const handleImageType = (id) => {
      if (id == 0) return <Biberon height={45} width={45} />;
      if (id == 1) return <Couche height={35} width={35} />;
      if (id == 2) return <Sante height={35} width={35} />;
      if (id == 3) return <Dodo height={35} width={35} />;
      if (id == 4) return <Thermo height={35} width={35} />;
      if (id == 5) return <Allaitement height={35} width={35} />;
    };

  function handleStatsCategory(selectedImage: number) {
    let filteredTasks = tasks.filter(task => task.id === selectedImage);
    babyID ? '' : filteredTasks = []
    switch (selectedImage) {
      case 0:
        return <BiberonComponent tasks={filteredTasks} navigation={navigation} />;
      case 1:
        return <DiaperComponent tasks={filteredTasks} navigation={undefined} />;
      case 3:
        return <SommeilComponent tasks={filteredTasks} />;
      case 4:
        return <ThermoComponent tasks={filteredTasks} />;
      case 5:
        return <AllaitementComponent tasks={filteredTasks} />;
      default:
        return null;
    }
  }

  return (
    <ScrollView style={{ padding: 10, backgroundColor: '#FDF1E7' }}>
      <View style={{  backgroundColor: '#FDF1E7',   }}>
        
              {/* Image picker */}
              <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
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
};

export default ManageBaby;

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
    borderColor: '#C75B4A',
    borderRadius: 8,
  },
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: 'white', // White input background
  },
  footer: {
    height: 100, // Adjust as needed
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#C75B4A', // Dark blue button background
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
  titleParameter: {
    color: '#7A8889', // White text color
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3
  },
});
