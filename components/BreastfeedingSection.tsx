import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Analytics from '../services/analytics';

export interface BreastfeedingValues {
  timer1: number;
  timer2: number;
  mode: 'timer' | 'manual';
  manualLeft: number;
  manualRight: number;
}

export interface BreastfeedingRef {
  getValues: () => BreastfeedingValues;
  clearTimers: () => Promise<void>;
}

interface Props {
  t: (key: string) => string;
  initialTimer1?: number;
  initialTimer2?: number;
  initialMode?: 'timer' | 'manual';
  initialManualLeft?: number;
  initialManualRight?: number;
  storageKeySuffix?: string;
}

const BreastfeedingSection = forwardRef<BreastfeedingRef, Props>(({
  t,
  initialTimer1 = 0,
  initialTimer2 = 0,
  initialMode = 'timer',
  initialManualLeft = 0,
  initialManualRight = 0,
  storageKeySuffix = 'createtask',
}, ref) => {
  const [timer1, setTimer1] = useState(initialTimer1);
  const [timer2, setTimer2] = useState(initialTimer2);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [mode, setMode] = useState<'timer' | 'manual'>(initialMode);
  const [manualLeft, setManualLeft] = useState(initialManualLeft);
  const [manualRight, setManualRight] = useState(initialManualRight);

  const interval1 = useRef<any>(null);
  const interval2 = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  useImperativeHandle(ref, () => ({
    getValues: () => ({ timer1, timer2, mode, manualLeft, manualRight }),
    clearTimers: async () => {
      await AsyncStorage.removeItem(`timer1_${storageKeySuffix}`);
      await AsyncStorage.removeItem(`timer2_${storageKeySuffix}`);
    },
  }));

  useEffect(() => {
    loadTimers();
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      clearInterval(interval1.current);
      clearInterval(interval2.current);
    };
  }, []);

  const handleAppStateChange = async (nextAppState: string) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      await loadTimers();
    }
    appState.current = nextAppState as any;
  };

  const saveTimer = async (key: string, elapsed: number, startTime: number | null, running: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ elapsed, startTime, isRunning: running }));
    } catch {}
  };

  const loadTimers = async () => {
    try {
      const [t1Data, t2Data] = await Promise.all([
        AsyncStorage.getItem(`timer1_${storageKeySuffix}`),
        AsyncStorage.getItem(`timer2_${storageKeySuffix}`),
      ]);

      if (t1Data) {
        const { elapsed, startTime, isRunning } = JSON.parse(t1Data);
        if (isRunning && startTime) {
          const additional = Math.floor((Date.now() - startTime) / 1000);
          const total = elapsed + additional;
          setTimer1(total);
          setIsRunning1(true);
          startInterval(setTimer1, interval1, startTime, elapsed);
        } else {
          setTimer1(elapsed);
        }
      }

      if (t2Data) {
        const { elapsed, startTime, isRunning } = JSON.parse(t2Data);
        if (isRunning && startTime) {
          const additional = Math.floor((Date.now() - startTime) / 1000);
          const total = elapsed + additional;
          setTimer2(total);
          setIsRunning2(true);
          startInterval(setTimer2, interval2, startTime, elapsed);
        } else {
          setTimer2(elapsed);
        }
      }
    } catch {}
  };

  const startInterval = (setTimer: any, intervalRef: any, startTime: number, initial: number) => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000) + initial;
      setTimer(elapsed);
    }, 1000);
  };

  const startTimer = (setTimer: any, setRunning: any, intervalRef: any, num: 1 | 2) => {
    const now = Date.now();
    const current = num === 1 ? timer1 : timer2;
    if (num === 1) saveTimer(`timer1_${storageKeySuffix}`, current, now, true);
    else saveTimer(`timer2_${storageKeySuffix}`, current, now, true);
    setRunning(true);
    startInterval(setTimer, intervalRef, now, current);
  };

  const pauseTimer = (setRunning: any, intervalRef: any, num: 1 | 2) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const current = num === 1 ? timer1 : timer2;
    const key = num === 1 ? `timer1_${storageKeySuffix}` : `timer2_${storageKeySuffix}`;
    saveTimer(key, current, null, false);
  };

  const stopTimer = (setTimer: any, setRunning: any, intervalRef: any, num: 1 | 2) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setTimer(0);
    const key = num === 1 ? `timer1_${storageKeySuffix}` : `timer2_${storageKeySuffix}`;
    saveTimer(key, 0, null, false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View>
      {/* Mode Switch */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => { setMode('timer'); Analytics.logEvent('tab_selected', { screen: 'CreateTask_Breastfeeding', tab: 'timer' }); }}
          style={[styles.modeButton, mode === 'timer' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'timer' && styles.modeTextSelected]}>
            ⏱️ {t('breastfeeding.timer')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setMode('manual'); Analytics.logEvent('tab_selected', { screen: 'CreateTask_Breastfeeding', tab: 'manual' }); }}
          style={[styles.modeButton, mode === 'manual' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'manual' && styles.modeTextSelected]}>
            ✏️ {t('breastfeeding.manual')}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'timer' ? (
        <View>
          {/* Timer gauche */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>{t('breast.left')}</Text>
            <Text style={styles.timerValue}>{formatTime(timer1)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity onPress={() => startTimer(setTimer1, setIsRunning1, interval1, 1)} disabled={isRunning1} style={[styles.timerBtn, isRunning1 && styles.timerBtnDisabled]}>
                <Ionicons name="play" size={24} color={isRunning1 ? '#D8ABA0' : '#F6F0EB'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pauseTimer(setIsRunning1, interval1, 1)} disabled={!isRunning1} style={[styles.timerBtn, !isRunning1 && styles.timerBtnDisabled]}>
                <Ionicons name="pause" size={24} color={!isRunning1 ? '#D8ABA0' : '#F6F0EB'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopTimer(setTimer1, setIsRunning1, interval1, 1)} style={styles.timerBtn}>
                <Ionicons name="close-circle" size={24} color="#F6F0EB" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Timer droit */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>{t('breast.right')}</Text>
            <Text style={styles.timerValue}>{formatTime(timer2)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity onPress={() => startTimer(setTimer2, setIsRunning2, interval2, 2)} disabled={isRunning2} style={[styles.timerBtn, isRunning2 && styles.timerBtnDisabled]}>
                <Ionicons name="play" size={24} color={isRunning2 ? '#D8ABA0' : '#F6F0EB'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pauseTimer(setIsRunning2, interval2, 2)} disabled={!isRunning2} style={[styles.timerBtn, !isRunning2 && styles.timerBtnDisabled]}>
                <Ionicons name="pause" size={24} color={!isRunning2 ? '#D8ABA0' : '#F6F0EB'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopTimer(setTimer2, setIsRunning2, interval2, 2)} style={styles.timerBtn}>
                <Ionicons name="close-circle" size={24} color="#F6F0EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.manualRow}>
          <View style={styles.manualColumn}>
            <Text style={styles.manualValue}>{manualLeft} {t('min')}</Text>
            <View style={styles.sliderWrapper}>
              <Slider
                style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                minimumValue={0}
                maximumValue={60}
                step={1}
                value={manualLeft}
                onValueChange={v => setManualLeft(Math.round(v))}
                minimumTrackTintColor="#C75B4A"
                maximumTrackTintColor="#D8ABA0"
                thumbTintColor="#C75B4A"
              />
            </View>
            <Text style={styles.manualLabel}>{t('breast.left')}</Text>
          </View>
          <View style={styles.manualColumn}>
            <Text style={styles.manualValue}>{manualRight} {t('min')}</Text>
            <View style={styles.sliderWrapper}>
              <Slider
                style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
                minimumValue={0}
                maximumValue={60}
                step={1}
                value={manualRight}
                onValueChange={v => setManualRight(Math.round(v))}
                minimumTrackTintColor="#C75B4A"
                maximumTrackTintColor="#D8ABA0"
                thumbTintColor="#C75B4A"
              />
            </View>
            <Text style={styles.manualLabel}>{t('breast.right')}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10 },
  modeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#C75B4A' },
  modeButtonSelected: { backgroundColor: '#C75B4A' },
  modeText: { fontSize: 14, fontWeight: '600', color: '#C75B4A' },
  modeTextSelected: { color: '#F6F0EB' },
  timerContainer: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  timerLabel: { fontSize: 16, fontWeight: '600', color: '#7A8889', marginBottom: 10 },
  timerValue: { fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 10 },
  timerButtons: { flexDirection: 'row', gap: 12 },
  timerBtn: { backgroundColor: '#C75B4A', borderRadius: 8, padding: 10 },
  timerBtnDisabled: { backgroundColor: '#E8D5C4' },
  manualRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  manualColumn: { alignItems: 'center' },
  manualValue: { fontSize: 28, fontWeight: 'bold', color: '#C75B4A', marginBottom: 5 },
  sliderWrapper: { height: 200, justifyContent: 'center', alignItems: 'center' },
  manualLabel: { fontSize: 16, fontWeight: '600', color: '#7A8889', marginTop: 5 },
});

export default BreastfeedingSection;
