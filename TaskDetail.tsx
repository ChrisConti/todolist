import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from './Context/ThemeContext';
import type { Theme } from './constants/theme';
import React, { useMemo, useContext, useState } from 'react';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { babiesRef, db } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import Card from './Card';

const TaskDetail = ({ route, navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [task, setTask] = useState(route.params.task);
  const [idTask, setIDTask] = useState(route.params.task.uid);
  const [createdBy, setCreatedBy] = useState(route.params.task.createdBy);
  const [comment, setComment] = useState(route.params.task.comment);
  const [taskDate, setTaskDate] = useState(route.params.task.date);

  const { user, setUser, babyID, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const [babySelected, setBabySelected] = useState(babyID);

  const images = [
    { id: 0, rq: require('./assets/biberon.png') },
    { id: 1, rq: require('./assets/diaper.png') },
    { id: 2, rq: require('./assets/medicaments.png') },
    { id: 3, rq: require('./assets/sommeil.png') },
    { id: 4, rq: require('./assets/thermo.png') },
    { id: 5, rq: require('./assets/allaitement.png') },
  ];

  const removeTaskFromBabyTasks = async () => {
    try {
      const queryResult = query(babiesRef, where('id', '==', babySelected));
      const querySnapshot = await getDocs(queryResult);
      const updatePromises = querySnapshot.docs.map(async (document) => {
        const currentTasks = document.data().tasks;
        const updatedTasks = currentTasks.filter(task => task.uid !== idTask);
        await updateDoc(doc(db, 'Baby', document.id), { tasks: updatedTasks });
      });
      await Promise.all(updatePromises);
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: theme.background }}>
      <Card key={task.id} task={task} navigation={navigation} editable={false} /> 
      <TextInput
        style={styles.inputComment}
        multiline
        numberOfLines={4}
        value={comment}
        placeholder={t('placeholder.comment')}
        editable={false}
      />
      <View style={{ flexDirection: 'row',  }}>
        <Text style={styles.textInfo} >{t('task.createdBy')}:</Text>
        <Text style={styles.textInfo}>{createdBy}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Text style={styles.textInfo}>{t('task.date')}:</Text>
        <Text style={styles.textInfo}>{taskDate}</Text>
      </View>

      {/* Footer */}
            <View style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
              alignItems: 'center',
              justifyContent: 'flex-end', // Pushes the button to the bottom
              flexDirection: 'column',
            }}>
              <TouchableOpacity onPress={removeTaskFromBabyTasks}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>{t('button.delete')}</Text>
                </View>
              </TouchableOpacity>
            </View>
    </View>
  );
};

export default TaskDetail;

const makeStyles = (theme: Theme) => StyleSheet.create({
  image: {
    width: 30,
    height: 30,
    resizeMode: 'cover',
  },
  imageSelected: {
    width: 55,
    height: 55,
    resizeMode: 'cover',
    borderColor: theme.accent,
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
  inputComment: {
    height: 100,
    width: 280,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: theme.accent,
    borderRadius: 8,
  },
  input: {
    width: 280,
    height: 50,
    borderBottomWidth: 1,
    borderColor: theme.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: theme.card, // White input background
  },
  footer: {
    height: 100, // Adjust as needed
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: theme.primary, // Dark blue button background
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 300,
  },
  buttonText: {
    color: theme.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  textInfo: {
    color: theme.textSecondary
  },
});
