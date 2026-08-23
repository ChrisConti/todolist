import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Analytics from '../services/analytics';
import {
  syncNursingActivity,
  endNursingActivity,
  shouldDiscardNursingSession,
  clearNursingWitness,
  getNursingActivityEnabled,
} from '../utils/nursingActivityBridge';

export interface BreastfeedingValues {
  timer1: number;
  timer2: number;
  mode: 'timer' | 'manual';
  manualLeft: number;
  manualRight: number;
  timerStartTime?: number; // Unix ms — wall-clock time when the first timer was originally started
}

export interface BreastfeedingRef {
  getValues: () => BreastfeedingValues;
  clearTimers: () => Promise<void>;
}

export interface BreastfeedingSessionInfo {
  startTime: number | null; // Unix ms of the first play press, null when no measurement exists
  mode: 'timer' | 'manual';
}

interface Props {
  t: (key: string) => string;
  initialTimer1?: number;
  initialTimer2?: number;
  initialMode?: 'timer' | 'manual';
  initialManualLeft?: number;
  initialManualRight?: number;
  storageKeySuffix?: string;
  onSessionChange?: (info: BreastfeedingSessionInfo) => void;
  liveActivity?: boolean; // Live Activity iOS (écran verrouillé + Dynamic Island), CreateTask uniquement
}

const BreastfeedingSection = forwardRef<BreastfeedingRef, Props>(({
  t,
  initialTimer1 = 0,
  initialTimer2 = 0,
  initialMode = 'timer',
  initialManualLeft = 0,
  initialManualRight = 0,
  storageKeySuffix = 'createtask',
  onSessionChange,
  liveActivity = false,
}, ref) => {
  const [timer1, setTimer1] = useState(initialTimer1);
  const [timer2, setTimer2] = useState(initialTimer2);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [mode, setMode] = useState<'timer' | 'manual'>(initialMode);
  const modeRef = useRef<'timer' | 'manual'>(initialMode);
  const [manualLeft, setManualLeft] = useState(initialManualLeft);
  const [manualRight, setManualRight] = useState(initialManualRight);
  const originalStartTime1 = useRef<number | null>(null);
  const originalStartTime2 = useRef<number | null>(null);

  const interval1 = useRef<any>(null);
  const interval2 = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const activityEnabledRef = useRef(true);

  const notifySession = (currentMode?: 'timer' | 'manual') => {
    const starts = [originalStartTime1.current, originalStartTime2.current].filter((s): s is number => s !== null);
    onSessionChange?.({
      startTime: starts.length > 0 ? Math.min(...starts) : null,
      mode: currentMode ?? modeRef.current,
    });
  };

  const changeMode = (newMode: 'timer' | 'manual') => {
    setMode(newMode);
    modeRef.current = newMode;
    notifySession(newMode);
  };

  // Pousse l'état courant des deux chronos vers la Live Activity iOS.
  // Les overrides couvrent les valeurs que setState n'a pas encore appliquées au moment de l'appel.
  const syncActivity = (o: { r1?: boolean; r2?: boolean; t1?: number; t2?: number } = {}) => {
    if (!liveActivity || !activityEnabledRef.current) return;
    const r1 = o.r1 ?? isRunning1;
    const r2 = o.r2 ?? isRunning2;
    const t1v = o.t1 ?? timer1;
    const t2v = o.t2 ?? timer2;
    if (!r1 && !r2 && t1v === 0 && t2v === 0) {
      endNursingActivity();
      return;
    }
    const starts = [originalStartTime1.current, originalStartTime2.current].filter((s): s is number => s !== null);
    const now = Date.now();
    syncNursingActivity({
      leftRunning: r1,
      leftStartRef: now - t1v * 1000,
      leftElapsed: t1v,
      rightRunning: r2,
      rightStartRef: now - t2v * 1000,
      rightElapsed: t2v,
      startedAt: starts.length > 0 ? Math.min(...starts) : now,
    });
  };

  useImperativeHandle(ref, () => ({
    getValues: () => {
      const starts = [originalStartTime1.current, originalStartTime2.current].filter((t): t is number => t !== null);
      const timerStartTime = starts.length > 0 ? Math.min(...starts) : undefined;
      return { timer1, timer2, mode, manualLeft, manualRight, timerStartTime };
    },
    clearTimers: async () => {
      await AsyncStorage.removeItem(`timer1_${storageKeySuffix}`);
      await AsyncStorage.removeItem(`timer2_${storageKeySuffix}`);
      if (liveActivity) endNursingActivity();
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

  const saveTimer = async (key: string, elapsed: number, startTime: number | null, running: boolean, originalStart: number | null) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ elapsed, startTime, isRunning: running, originalStart }));
    } catch {}
  };

  const loadTimers = async () => {
    try {
      if (liveActivity) {
        activityEnabledRef.current = await getNursingActivityEnabled();
      }

      const [t1Data, t2Data] = await Promise.all([
        AsyncStorage.getItem(`timer1_${storageKeySuffix}`),
        AsyncStorage.getItem(`timer2_${storageKeySuffix}`),
      ]);

      // Kill volontaire de l'app, swipe de la Live Activity, ou expiration 8h :
      // l'activité a disparu alors qu'une session tournait → l'utilisateur n'en veut plus, on purge tout.
      if (liveActivity && (t1Data || t2Data) && (await shouldDiscardNursingSession())) {
        await AsyncStorage.removeItem(`timer1_${storageKeySuffix}`);
        await AsyncStorage.removeItem(`timer2_${storageKeySuffix}`);
        await clearNursingWitness();
        clearInterval(interval1.current);
        clearInterval(interval2.current);
        originalStartTime1.current = null;
        originalStartTime2.current = null;
        setTimer1(0);
        setTimer2(0);
        setIsRunning1(false);
        setIsRunning2(false);
        notifySession();
        return;
      }

      let t1v = 0, t2v = 0, r1 = false, r2 = false;

      if (t1Data) {
        const { elapsed, startTime, isRunning, originalStart } = JSON.parse(t1Data);
        if (originalStart) originalStartTime1.current = originalStart;
        if (isRunning && startTime) {
          const additional = Math.floor((Date.now() - startTime) / 1000);
          t1v = elapsed + additional;
          r1 = true;
          setTimer1(t1v);
          setIsRunning1(true);
          startInterval(setTimer1, interval1, startTime, elapsed);
        } else {
          t1v = elapsed;
          setTimer1(elapsed);
        }
      }

      if (t2Data) {
        const { elapsed, startTime, isRunning, originalStart } = JSON.parse(t2Data);
        if (originalStart) originalStartTime2.current = originalStart;
        if (isRunning && startTime) {
          const additional = Math.floor((Date.now() - startTime) / 1000);
          t2v = elapsed + additional;
          r2 = true;
          setTimer2(t2v);
          setIsRunning2(true);
          startInterval(setTimer2, interval2, startTime, elapsed);
        } else {
          t2v = elapsed;
          setTimer2(elapsed);
        }
      }

      const starts = [originalStartTime1.current, originalStartTime2.current].filter((t): t is number => t !== null);
      if (starts.length > 0) {
        notifySession();
      }
      if (r1 || r2 || t1v > 0 || t2v > 0) {
        syncActivity({ r1, r2, t1: t1v, t2: t2v });
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
    const origRef = num === 1 ? originalStartTime1 : originalStartTime2;
    // Only set originalStart on the very first press (elapsed === 0 and no prior originalStart)
    const isFirstStart = current === 0 && origRef.current === null;
    if (isFirstStart) origRef.current = now;
    const originalStart = origRef.current;
    if (num === 1) saveTimer(`timer1_${storageKeySuffix}`, current, now, true, originalStart);
    else saveTimer(`timer2_${storageKeySuffix}`, current, now, true, originalStart);
    setRunning(true);
    startInterval(setTimer, intervalRef, now, current);
    if (isFirstStart) notifySession();
    syncActivity(num === 1 ? { r1: true, t1: current } : { r2: true, t2: current });
  };

  const pauseTimer = (setRunning: any, intervalRef: any, num: 1 | 2) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const current = num === 1 ? timer1 : timer2;
    const key = num === 1 ? `timer1_${storageKeySuffix}` : `timer2_${storageKeySuffix}`;
    const originalStart = (num === 1 ? originalStartTime1 : originalStartTime2).current;
    saveTimer(key, current, null, false, originalStart);
    syncActivity(num === 1 ? { r1: false, t1: current } : { r2: false, t2: current });
  };

  const stopTimer = (setTimer: any, setRunning: any, intervalRef: any, num: 1 | 2) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setTimer(0);
    const origRef = num === 1 ? originalStartTime1 : originalStartTime2;
    origRef.current = null;
    const key = num === 1 ? `timer1_${storageKeySuffix}` : `timer2_${storageKeySuffix}`;
    saveTimer(key, 0, null, false, null);
    notifySession();
    syncActivity(num === 1 ? { r1: false, t1: 0 } : { r2: false, t2: 0 });
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
          onPress={() => { changeMode('timer'); Analytics.logEvent('tab_selected', { screen: 'CreateTask_Breastfeeding', tab: 'timer' }); }}
          style={[styles.modeButton, mode === 'timer' && styles.modeButtonSelected]}
        >
          <Text style={[styles.modeText, mode === 'timer' && styles.modeTextSelected]}>
            ⏱️ {t('breastfeeding.timer')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { changeMode('manual'); Analytics.logEvent('tab_selected', { screen: 'CreateTask_Breastfeeding', tab: 'manual' }); }}
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
