import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, set } from 'firebase/database';
import { auth } from './config'; // Adjust the import according to your Firebase config file

const TwoTimers = ({ babyID, taskID }) => {
  const [timer1, setTimer1] = useState(0);
  const [timer2, setTimer2] = useState(0);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const interval1 = useRef(null);
  const interval2 = useRef(null);

  const startTimer = (setTimer, setIsRunning, interval) => {
    setIsRunning(true);
    interval.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = (setIsRunning, interval) => {
    setIsRunning(false);
    clearInterval(interval.current);
  };

  const stopTimer = (setTimer, setIsRunning, interval) => {
    setIsRunning(false);
    clearInterval(interval.current);
    setTimer(0);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validate = () => {
    const db = getDatabase();
    const user = auth.currentUser;
    if (user) {
      set(ref(db, `tasks/${babyID}/${taskID}`), {
        timer1,
        timer2
      }).then(() => {
        console.log('Data saved successfully');
      }).catch((error) => {
        console.error('Error saving data: ', error);
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Text>Timer 1: {formatTime(timer1)}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => startTimer(setTimer1, setIsRunning1, interval1)} disabled={isRunning1}>
            <Ionicons name="play" size={24} color={isRunning1 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pauseTimer(setIsRunning1, interval1)} disabled={!isRunning1}>
            <Ionicons name="pause" size={24} color={!isRunning1 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => stopTimer(setTimer1, setIsRunning1, interval1)}>
            <Ionicons name="stop" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.timerContainer}>
        <Text>Timer 2: {formatTime(timer2)}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => startTimer(setTimer2, setIsRunning2, interval2)} disabled={isRunning2}>
            <Ionicons name="play" size={24} color={isRunning2 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pauseTimer(setIsRunning2, interval2)} disabled={!isRunning2}>
            <Ionicons name="pause" size={24} color={!isRunning2 ? "#C75B4A" : "black"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => stopTimer(setTimer2, setIsRunning2, interval2)}>
            <Ionicons name="stop" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timerContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    marginTop: 10,
  },
});

export default TwoTimers;