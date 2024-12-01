// BreastfeedingTimersScreen.js
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';

const Timers = () => {
  const [timers, setTimers] = useState([
    { id: 1, duration: 0 }, // 5 minutes
    { id: 2, duration: 0 }, // 10 minutes
    { id: 3, duration: 0 }, // 15 minutes
  ]);

  //console.log(timers)

  const timerRefs = useRef([]);

  const handleStart = (timerId) => {
    timerRefs.current[timerId].start();
  };

  const handlePause = (timerId) => {
    timerRefs.current[timerId].pause();
  };

  const handleStop = (timerId) => {
    timerRefs.current[timerId].stop();
  };

  const handleRestart = (timerId) => {
    timerRefs.current[timerId].restart();
  };

  return (
    <View>
      {timers.map((timer) => (
        <View key={timer.id}>
          {/* Timer Display */}
          <CountdownCircleTimer
            ref={(ref) => (timerRefs.current[timer.id] = ref)}
            isPlaying={false}
            duration={timer.duration}
            colors={[['#FF0000']]}
            strokeWidth={8} // Customize the stroke width of the circle
      trailColor="#E0E0E0" // Color of the trail (background)
      size={80}
          >
            {({ remainingTime }) => (
              <Text>{remainingTime}</Text>
            )}
          </CountdownCircleTimer>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleStart(timer.id)}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handlePause(timer.id)}
            >
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleStop(timer.id)}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleRestart(timer.id)}
            >
              <Text style={styles.buttonText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007AFF', // Customize button color
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF', // Customize button text color
    fontWeight: 'bold',
  },
});


export default Timers;
