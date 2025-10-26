import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import analytics from '../services/analytics';

export default function AnalyticsTest() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBasicEvent = async () => {
    try {
      await analytics.logEvent('test_event', { test_param: 'hello' });
      addLog('✅ Basic event logged successfully');
    } catch (error) {
      addLog(`❌ Basic event error: ${error}`);
    }
  };

  const testScreenView = async () => {
    try {
      await analytics.logScreenView('TestScreen', 'AnalyticsTest');
      addLog('✅ Screen view logged successfully');
    } catch (error) {
      addLog(`❌ Screen view error: ${error}`);
    }
  };

  const testUserProperty = async () => {
    try {
      await analytics.setUserProperty('test_user_type', 'tester');
      addLog('✅ User property set successfully');
    } catch (error) {
      addLog(`❌ User property error: ${error}`);
    }
  };

  const testUserId = async () => {
    try {
      await analytics.setUserId('test_user_123');
      addLog('✅ User ID set successfully');
    } catch (error) {
      addLog(`❌ User ID error: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Analytics Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testBasicEvent}>
          <Text style={styles.buttonText}>Test Basic Event</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testScreenView}>
          <Text style={styles.buttonText}>Test Screen View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testUserProperty}>
          <Text style={styles.buttonText}>Test User Property</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testUserId}>
          <Text style={styles.buttonText}>Test User ID</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logsTitle}>Logs:</Text>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#C75B4A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
  },
  logText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});
