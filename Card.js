import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import { useTimeAgo } from './hooks/useTimeAgo';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { useTheme } from './Context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Allaitement from './assets/allaitement-clair.svg';
import Thermo from './assets/thermo-clair.svg';
import Dodo from './assets/dodo-clair.svg';
import Couche from './assets/couche-clair.svg';
import Sante from './assets/sante-clair.svg';
import Biberon from './assets/biberon-clair.svg';

// Static — defined once outside the component, not recreated on every render

const Card = ({ task, navigation, editable }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Le contenu est posé sur une carte colorée : sa teinte ne dépend pas du thème,
  // seule la couleur de fond de la carte change.
  const onCat = theme.onCategory;

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

  const formatBoobDuration = (seconds) => {
    if (seconds < 60) return seconds + ' s';
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    return totalMinutes + ' ' + t('min');
  };

  const handleCategory = (id) => {
    if (id == 0) return <Text style={{ color: theme.onCategory, fontSize: 15, marginLeft: -6 }}>{t('ml')}</Text>;
    if (id == 3) {
      const totalMins = parseInt(String(task.label));
      if (!isNaN(totalMins) && totalMins >= 60) return null;
      return <Text style={{ color: theme.onCategory, fontSize: 15, marginLeft: -6 }}>{t('min')}</Text>;
    }
    if (id == 4) {
      const hasTemp = task.label && task.label !== '0';
      const hasDuration = task.temperatureDuration;
      if (hasTemp && hasDuration) return null;
      if (hasTemp) return <Text style={{ color: theme.onCategory, fontSize: 15, marginLeft: -6 }}>°</Text>;
      if (hasDuration) return <Text style={{ color: theme.onCategory, fontSize: 15, marginLeft: -6 }}>s</Text>;
      return null;
    }
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
  const timeAgo = useTimeAgo(task.date);

  const getDiaperContentIcon = () => {
    if (task.id !== 1) return null;

    const diaperContent = task.diaperContent;
    if (diaperContent === 0) return '💦';
    if (diaperContent === 1) return '💩';
    if (diaperContent === 2) return '💦💩';
    return null;
  };

  const getMilkTypeIcon = () => {
    if (task.id !== 0) return null;
    if (task.milkType === 'artificial') return '🥛';
    if (task.milkType === 'maternal') return '🤱';
    return null;
  };

  const getBreastfeedingModeIcon = () => {
    if (task.id !== 5) return null;
    // Un tirage n'a pas de mode chrono/manuel : il porte le verre de lait du
    // sélecteur « 🥛 Tire-lait ». Les tâches écrites avant la correction ont un
    // breastfeedingMode : on l'ignore à la lecture plutôt que de migrer la base.
    if (task.nursingType === 'pumping') return '🥛';
    if (task.breastfeedingMode === 'timer') return '⏱️';
    if (task.breastfeedingMode === 'manual') return '✏️';
    return null;
  };

  const getSleepLocationIcon = () => {
    if (task.id !== 3) return null;
    switch (task.sleepLocation) {
      case 'bed':          return '🛏️';
      case 'arms':         return '🤲';
      case 'breastfeeding': return '🤱';
      case 'bottle':       return '🍼';
      case 'bouncer':      return '🪑';
      case 'other':        return '💤';
      default:             return null;
    }
  };

  const handleCategoryLabel = () => {
    // Un tirage est une tâche de catégorie 5 sans durée par sein : sans ce cas,
    // la carte afficherait une tétée vide au lieu de la quantité tirée.
    // Même présentation qu'une tétée : un sein par ligne, pas la somme.
    if (task.id == 5 && task.nursingType === 'pumping') {
      const left = task.pumpedLeftMl || 0;
      const right = task.pumpedRightMl || 0;
      if (left && right) {
        return (
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: onCat, fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{`${t('L')} ${left} ${t('ml')}`}</Text>
            <Text style={{ color: onCat, fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{`${t('R')} ${right} ${t('ml')}`}</Text>
          </View>
        );
      } else if (left) {
        return <Text style={{ color: onCat, fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{`${t('L')} ${left} ${t('ml')}`}</Text>;
      } else if (right) {
        return <Text style={{ color: onCat, fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{`${t('R')} ${right} ${t('ml')}`}</Text>;
      }
      // Sans détail par sein : le total seul.
      return (
        <Text style={{ color: onCat, fontSize: 22, marginRight: 8, alignSelf: 'flex-end' }}>
          {`${task.pumpedMl || 0} ${t('ml')}`}
        </Text>
      );
    }
    if (task.id == 5) {
      if (task.boobLeft && task.boobRight) {
        return (
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: onCat, fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{t('L') + ' ' + formatBoobDuration(task.boobLeft)}</Text>
            <Text style={{ color: onCat, fontSize: 15, marginRight: 8, alignSelf: 'flex-end' }}>{t('R') + ' ' + formatBoobDuration(task.boobRight)}</Text>
          </View>
        );
      } else if (task.boobLeft) {
        return <Text style={{ color: onCat, fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{t('L') + ' ' + formatBoobDuration(task.boobLeft)}</Text>;
      } else if (task.boobRight) {
        return <Text style={{ color: onCat, fontSize: 25, marginRight: 8, alignSelf: 'flex-end' }}>{t('R') + ' ' + formatBoobDuration(task.boobRight)}</Text>;
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
    if (task.id == 3 && task.label) {
      const totalMins = parseInt(String(task.label));
      if (!isNaN(totalMins) && totalMins >= 60) {
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        return <Text>{`${hours}h${mins.toString().padStart(2, '0')}`}</Text>;
      }
    }
    if (task.id == 4) {
      const hasTemp = task.label && task.label !== '0';
      const hasDuration = task.temperatureDuration;
      if (hasTemp && hasDuration) return <Text>{task.label}° · {task.temperatureDuration}s</Text>;
      if (hasTemp) return <Text>{task.label}</Text>;
      if (hasDuration) return <Text>{task.temperatureDuration}</Text>;
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
      style={[styles.card, { backgroundColor: theme.category[task.id] }]}>
      <View style={styles.leftSection}>
        {handleImageType()}
        <View style={styles.iconsColumn}>
          {/* Line 1: Comment icon or empty space */}
          <View style={styles.iconRow}>
            {task.comment && task.comment.trim() !== '' && (
              <Ionicons name="chatbubble-ellipses" size={20} color={onCat} />
            )}
          </View>
          {/* Line 2: Content icon or empty space */}
          <View style={styles.iconRow}>
            {getDiaperContentIcon() && (
              <Text style={styles.emojiIcon}>{getDiaperContentIcon()}</Text>
            )}
            {getSleepLocationIcon() && (
              <Text style={styles.emojiIcon}>{getSleepLocationIcon()}</Text>
            )}
            {getMilkTypeIcon() && (
              <Text style={styles.emojiIcon}>{getMilkTypeIcon()}</Text>
            )}
            {getBreastfeedingModeIcon() && (
              <Text style={styles.emojiIcon}>{getBreastfeedingModeIcon()}</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.centerSection}>
        <Text style={[styles.labelText, { color: onCat }]}>
          {handleCategoryLabel()}
        </Text>
        <View>
          {handleCategory(task.id)}
        </View>
      </View>
      <View style={styles.timeSection}>
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: onCat }]}>{formattedTimes.time}</Text>
          {formattedTimes.isEnglish && (
            <Text style={[styles.periodText, { color: onCat }]}>{formattedTimes.period}</Text>
          )}
        </View>
        <View style={styles.timeAgoRow}>
          <Ionicons name="time-outline" size={12} color={onCat} style={{ opacity: 0.75 }} />
          <Text style={[styles.timeAgoText, { color: onCat }]}>{timeAgo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 2,
    marginLeft: 8,
    marginRight: 8,
  },
  leftSection: { flexDirection: 'row', alignItems: 'flex-start', width: 95 },
  iconsColumn: { flexDirection: 'column', marginLeft: 8, justifyContent: 'flex-start' },
  iconRow: { height: 20, marginBottom: 2 },
  emojiIcon: { fontSize: 20, lineHeight: 20 },
  centerSection: { flexDirection: 'row' },
  labelText: { fontSize: 25, marginRight: 8, alignSelf: 'flex-end' },
  timeSection: { flexDirection: 'column', alignItems: 'flex-end' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timeText: { fontSize: 25 },
  periodText: { fontSize: 15, marginLeft: 2 },
  timeAgoRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeAgoText: { fontSize: 11, opacity: 0.75 },
});

export default React.memo(Card);
