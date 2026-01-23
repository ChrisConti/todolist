import { View, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Allaitement from './assets/allaitement-clair.svg';
import Thermo from './assets/thermo-clair.svg';
import Dodo from './assets/dodo-clair.svg';
import Couche from './assets/couche-clair.svg';
import Sante from './assets/sante-clair.svg';
import Biberon from './assets/biberon-clair.svg';

const Card = ({ task, navigation, editable }) => {
  const { t } = useTranslation();
  const images = [
    { id: 0, rq: require('./assets/biberon.png'), color: '#34777B' },
    { id: 1, rq: require('./assets/diaper.png'), color: '#C75B4A' },
    { id: 2, rq: require('./assets/medicaments.png'), color: '#6B8DEA' },
    { id: 3, rq: require('./assets/sommeil.png'), color: '#E29656' },
    { id: 4, rq: require('./assets/thermo.png'), color: '#4F469F' },
    { id: 5, rq: require('./assets/allaitement.png'), color: '#1AAAAA' },
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
    return hrs.toString().padStart(2, '0') + ':' + mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  const formatMinutes = (seconds) => {
    const totalMinutes = Math.floor(seconds / 60);
    return totalMinutes;
  };

  const handleCategory = (id) => {
    if (id == 0) return <Text style={{ color: 'white', fontSize: 15, marginLeft: -6 }}>{t('ml')}</Text>;
    if (id == 3) return <Text style={{ color: 'white', fontSize: 15, marginLeft: -6 }}>{t('min')}</Text>;
    if (id == 4) return <Text style={{ color: 'white', fontSize: 15, marginLeft: -6 }}>°</Text>;
  };

  const handleImageType = () => {
    if (task.id == 0) return <Biberon height={45} width={45} />;
    if (task.id == 1) return <Couche height={45} width={45} />;
    if (task.id == 2) return <Sante height={45} width={45} />;
    if (task.id == 3) return <Dodo height={45} width={45} />;
    if (task.id == 4) return <Thermo height={45} width={45} />;
    if (task.id == 5) return <Allaitement height={45} width={45} />;
  };

  const formatTimeBasedOnLocale = (date) => {
    const time = new Date(date);
    const locales = Localization.getLocales();
    const locale = locales[0]?.languageTag || 'en'; // Default to 'en' if no locale is found

    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: locale.startsWith('en'), // Use 12-hour format for English locales
    };

    const formattedTime = time.toLocaleTimeString(locale, options);
    const isEnglish = locale.startsWith('en');
    const period = isEnglish ? formattedTime.slice(-2) : '';
    return {
      time: isEnglish ? formattedTime.slice(0, -3) : formattedTime,
      period,
      isEnglish,
    };
  };

  const formattedTimes = formatTimeBasedOnLocale(task.date);

  const getDiaperContentIcon = () => {
    if (task.id !== 1) return null;

    const diaperContent = task.diaperContent;
    if (diaperContent === 0) return '💦'; // Pee (multiple drops)
    if (diaperContent === 1) return '💩'; // Poop
    if (diaperContent === 2) return '💦💩'; // Both
    return null;
  };

  const handleCategoryLabel = () => {
    if (task.id == 5) {
      if (task.boobLeft && task.boobRight) {
        return (
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: '#F6F0EB', fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{t('L') + ' ' + formatMinutes(task.boobLeft) + ' ' + t('min')}</Text>
            <Text style={{ color: '#F6F0EB', fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{t('R') + ' ' + formatMinutes(task.boobRight) + ' ' + t('min')}</Text>
          </View>
        );
      } else if (task.boobLeft) {
        return <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{t('L') + ' ' + formatMinutes(task.boobLeft) + ' ' + t('min')}</Text>;
      } else if (task.boobRight) {
        return <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{t('R') + ' ' + formatMinutes(task.boobRight) + ' ' + t('min')}</Text>;
      }
    }
    // Support both new diaperType and legacy idCaca for backward compatibility
    if (task.id == 1) {
      const diaperType = task.diaperType ?? task.idCaca;
      if (diaperType !== undefined && diaperType !== null) {
        return <Text>{imagesDiapers[diaperType].name}</Text>;
      }
      return <Text>-</Text>;
    }
    return <Text>{task.label}</Text>;
  };

  return (
    <TouchableOpacity
      onPress={() => {
        editable
          ? navigation.navigate('UpdateTask', { task: task })
          : null;
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
      <View style={{ flexDirection: "column", alignItems: "flex-start" }}>
        {handleImageType()}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          {task.comment && task.comment.trim() !== '' && (
            <Ionicons name="chatbubble-ellipses" size={20} color="#F6F0EB" />
          )}
          {getDiaperContentIcon() && (
            <Text style={{ fontSize: 20, marginLeft: task.comment && task.comment.trim() !== '' ? 4 : 0 }}>{getDiaperContentIcon()}</Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Text style={{ color: '#F6F0EB', fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>
          {handleCategoryLabel()}
        </Text>
        <View>
          {handleCategory(images[task.id].id)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ color: '#F6F0EB', fontSize: 25 }}>
          {formattedTimes.time}
        </Text>
        {formattedTimes.isEnglish && (
          <Text style={{ color: '#F6F0EB', fontSize: 15, marginLeft: 2 }}>
            {formattedTimes.period}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default Card;
