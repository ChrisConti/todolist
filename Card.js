import { View, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import Allaitement from './assets/allaitement-clair.svg';
import Thermo from './assets/thermo-clair.svg';
import Dodo from './assets/dodo-clair.svg';
import Couche from './assets/couche-clair.svg';
import Sante from './assets/sante-clair.svg';
import Biberon from './assets/biberon-clair.svg';

const Card = ({ task, navigation, editable }) => {
  const { t } = useTranslation();
  const images = [
    { id: 0, rq: require('./assets/biberon.png'), color: '#1AAAAA' },
    { id: 1, rq: require('./assets/diaper.png'), color: '#C75B4A' },
    { id: 2, rq: require('./assets/medicaments.png'), color: '#E29656' },
    { id: 3, rq: require('./assets/sommeil.png'), color: '#1AAAAA' },
    { id: 4, rq: require('./assets/thermo.png'), color: '#E29656' },
    { id: 5, rq: require('./assets/allaitement.png'), color: '#E29656' },
  ];

  const imagesDiapers = [
    { id: 0, name: t('diapers.dur'), nameTrad:'dur' },
    { id: 1, name: t('diapers.mou'), nameTrad:'mou' },
    { id: 2, name: t('diapers.liquide'), nameTrad:'liquide' },
  ];

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs.toString().padStart(2, '0')+ ':' + mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  const handleCategory = (id) => {
    if (id == 0) return <Text style={{ color: 'white', fontSize: 15, marginLeft:-6 }}>{t('ml')}</Text>;
    if (id == 3) return <Text style={{ color: 'white', fontSize: 15, marginLeft:-6 }}>{t('min')}</Text>;
    if (id == 4) return <Text style={{ color: 'white', fontSize: 15, marginLeft:-6}}>{t('celsius')}</Text>;
  };

  const handleImageType = () => {
    if (task.id == 0) return <Biberon height={45} width={45} />;
    if (task.id == 1) return <Couche height={45} width={45} />;
    if (task.id == 2) return <Sante height={45} width={45} />;
    if (task.id == 3) return (
      <View style={{ paddingLeft: 8 }}>
      <Dodo height={45} width={45} />;
      </View>
    )
    if (task.id == 4) return <Thermo height={45} width={45} />;
    if (task.id == 5) return <Allaitement height={45} width={45} />;
    
  };

  const handleCategoryLabel = () => {
    //console.log(task);
    if(task.id == 5) {
      if(task.boobLeft && task.boobLeft) {
        return (
          <View style={{ flexDirection: 'column'}}>
            <Text style={{ color: '#F6F0EB', fontSize: 15, marginRight: 8, alignSelf:'flex-end' }}>{t('L') + ' ' + formatTime(task.boobLeft)}</Text>
            <Text style={{ color: '#F6F0EB', fontSize: 15, marginRight: 8, alignSelf:'flex-end' }}>{t('R') + ' ' + formatTime(task.boobRight)}</Text>
          </View>
        );
      } else if(task.boobLeft) {
        return <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf:'flex-end' }}>{t('L') + ' ' + formatTime(task.boobLeft)}</Text>
      } else if(task.boobRight) {
        return <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf:'flex-end' }}>{t('R') + ' ' + formatTime(task.boobRight)}</Text>
      } 
    } 
    if(task.id == 1) return <Text>{imagesDiapers[task.idCaca].name}</Text>
    return <Text>{task.label}</Text>
  }

  return (
    <TouchableOpacity
      onPress={() => {
        editable ? 
        navigation.navigate('TaskDetail', { task }) 
        :
        null
      }}
      key={task.uid}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: images[task.id].color,
        borderColor: '#C75B4A',
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 2,
        marginLeft: 8,
        marginRight: 8
      }}>
      <View style={{ flexDirection: "row", alignItems: "center", }}>
          {handleImageType()}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf:'flex-end' }}>
          {handleCategoryLabel()}
        </Text>
        {handleCategory(images[task.id].id)}
      </View>
      <View>
        <Text style={{ color: '#F6F0EB', fontSize: 25 }}>
          {moment(task.date).format('HH:mm')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Card;
