import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Analytics from '../services/analytics';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import {
  syncNursingActivity,
  endNursingActivity,
  shouldDiscardNursingSession,
  clearNursingWitness,
  getNursingActivityEnabled,
} from '../utils/nursingActivityBridge';

export type NursingType = 'direct' | 'pumping';

export interface BreastfeedingValues {
  timer1: number;
  timer2: number;
  mode: 'timer' | 'manual';
  manualLeft: number;
  manualRight: number;
  timerStartTime?: number; // Unix ms — wall-clock time when the first timer was originally started
  /** Nature de l'acte. Absent sur tout l'historique ⇒ 'direct', aucune migration nécessaire. */
  nursingType: NursingType;
  /** Quantité tirée par sein, en ml. Une mère obtient rarement autant des deux côtés. */
  pumpedLeftMl: number;
  pumpedRightMl: number;
  /** Total tiré : somme des deux seins, pour les stats et l'export. */
  pumpedMl: number;
  /** Durée du tirage, en minutes. 0 = non renseignée (le champ est facultatif). */
  pumpedDurationMin: number;
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
  initialNursingType?: NursingType;
  initialPumpedLeftMl?: number;
  initialPumpedRightMl?: number;
  initialPumpedDurationMin?: number;
  storageKeySuffix?: string;
  onSessionChange?: (info: BreastfeedingSessionInfo) => void;
  liveActivity?: boolean; // Live Activity iOS (écran verrouillé + Dynamic Island), CreateTask uniquement
}

/** Largeur des blocs de formulaire, commune à CreateTask et UpdateTask. */
const FORM_WIDTH = 280;

const MIN_CHIPS = [5, 10, 15, 20];      // durées de tétée les plus fréquentes
const ML_SIDE_CHIPS = [60, 90, 120]; // par sein : trois puces tiennent en demi-largeur
const MAX_MIN = 120;
const MAX_ML = 500;
const LONG_PRESS_STEP = 5; // l'appui long avance par 5 : 0 → 20 en quatre appuis au lieu de vingt

interface StepperProps {
  label: string;
  value: number;
  unit: string;
  chips: number[];
  onChange: (v: number) => void;
  max: number;
  step?: number;
  compact?: boolean;
  theme: Theme;
}

/**
 * Saisie d'une valeur entière par boutons − / + et puces de raccourci.
 *
 * Remplace un Slider pivoté à -90°, qui n'était ni visible ni tactile sur Android :
 * React Native applique la rotation au rendu mais pas à la zone de toucher, et le
 * composant natif sous-jacent ne se laisse pas transformer.
 */
const Stepper: React.FC<StepperProps> = ({ label, value, unit, chips, onChange, max, step = 1, compact, theme }) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const bump = (delta: number) => onChange(Math.min(max, Math.max(0, value + delta)));
  return (
    <View style={styles.stepperColumn}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Text style={[styles.stepperValue, compact && styles.stepperValueCompact]}>
        {value} <Text style={styles.stepperUnit}>{unit}</Text>
      </Text>
      <View style={styles.stepperButtons}>
        <TouchableOpacity
          onPress={() => bump(-step)}
          onLongPress={() => bump(-step * LONG_PRESS_STEP)}
          disabled={value === 0}
          style={[styles.stepperBtn, value === 0 && styles.stepperBtnDisabled]}
          accessibilityLabel={`${label} −${step}`}
        >
          <Ionicons name="remove" size={22} color={value === 0 ? theme.onDisabled : theme.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => bump(step)}
          onLongPress={() => bump(step * LONG_PRESS_STEP)}
          disabled={value >= max}
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          accessibilityLabel={`${label} +${step}`}
        >
          <Ionicons name="add" size={22} color={value >= max ? theme.onDisabled : theme.onPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.chipRow}>
        {chips.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, value === c && styles.chipSelected]}
          >
            <Text style={[styles.chipText, value === c && styles.chipTextSelected]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const BreastfeedingSection = forwardRef<BreastfeedingRef, Props>(({
  t,
  initialTimer1 = 0,
  initialTimer2 = 0,
  initialMode = 'timer',
  initialManualLeft = 0,
  initialManualRight = 0,
  initialNursingType = 'direct',
  initialPumpedLeftMl = 0,
  initialPumpedRightMl = 0,
  initialPumpedDurationMin = 0,
  storageKeySuffix = 'createtask',
  onSessionChange,
  liveActivity = false,
}, ref) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [timer1, setTimer1] = useState(initialTimer1);
  const [timer2, setTimer2] = useState(initialTimer2);
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [mode, setMode] = useState<'timer' | 'manual'>(initialMode);
  const modeRef = useRef<'timer' | 'manual'>(initialMode);
  const [manualLeft, setManualLeft] = useState(initialManualLeft);
  const [manualRight, setManualRight] = useState(initialManualRight);
  const [nursingType, setNursingType] = useState<NursingType>(initialNursingType);
  const [pumpedLeftMl, setPumpedLeftMl] = useState(initialPumpedLeftMl);
  const [pumpedRightMl, setPumpedRightMl] = useState(initialPumpedRightMl);
  const [pumpedDurationMin, setPumpedDurationMin] = useState(initialPumpedDurationMin);
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

  const changeNursingType = (next: NursingType) => {
    if (next === nursingType) return;
    setNursingType(next);
    // L'écran verrouillé annoncerait une tétée en cours pendant un tirage.
    if (next === 'pumping' && liveActivity) endNursingActivity();
    Analytics.logEvent('tab_selected', { screen: 'CreateTask_Breastfeeding', tab: next });
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
      return {
        timer1, timer2, mode, manualLeft, manualRight, timerStartTime,
        nursingType, pumpedLeftMl, pumpedRightMl,
        pumpedMl: pumpedLeftMl + pumpedRightMl,
        pumpedDurationMin,
      };
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
      {/* Nature de l'acte : tétée directe ou lait tiré.
          Volontairement un mode de la catégorie 5 et non une 7e catégorie — une tâche
          d'id inconnu s'afficherait sans icône sur les versions non mises à jour
          (Card.js n'a pas de rendu de repli). */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => changeNursingType('direct')}
          style={[styles.typeButton, nursingType === 'direct' && styles.typeButtonSelected]}
        >
          <Text style={[styles.typeText, nursingType === 'direct' && styles.typeTextSelected]}>
            {t('breastfeeding.direct')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeNursingType('pumping')}
          style={[styles.typeButton, nursingType === 'pumping' && styles.typeButtonSelected]}
        >
          <Text style={[styles.typeText, nursingType === 'pumping' && styles.typeTextSelected]}>
            {t('breastfeeding.pumping')}
          </Text>
        </TouchableOpacity>
      </View>

      {nursingType === 'pumping' ? (
        <View style={styles.pumpingForm}>
          {/* Même disposition que la saisie manuelle d'une tétée : une colonne par
              sein. Une mère obtient rarement autant des deux côtés, et le total se
              déduit, alors qu'un sélecteur « les deux » perdait cette information. */}
          <View style={styles.manualRow}>
            <Stepper
              label={t('breast.left')}
              value={pumpedLeftMl}
              unit={t('ml')}
              chips={ML_SIDE_CHIPS}
              onChange={setPumpedLeftMl}
              max={MAX_ML}
              step={10}
              theme={theme}
            />
            <Stepper
              label={t('breast.right')}
              value={pumpedRightMl}
              unit={t('ml')}
              chips={ML_SIDE_CHIPS}
              onChange={setPumpedRightMl}
              max={MAX_ML}
              step={10}
              theme={theme}
            />
          </View>
          <Text style={styles.pumpedTotal}>
            {t('breastfeeding.pumpTotal')} · {pumpedLeftMl + pumpedRightMl} {t('ml')}
          </Text>
          <Stepper
            label={t('breastfeeding.pumpedDuration')}
            value={pumpedDurationMin}
            unit={t('min')}
            chips={MIN_CHIPS}
            onChange={setPumpedDurationMin}
            max={MAX_MIN}
            compact
            theme={theme}
          />
        </View>
      ) : (
      <>
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
                <Ionicons name="play" size={24} color={isRunning1 ? theme.onDisabled : theme.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pauseTimer(setIsRunning1, interval1, 1)} disabled={!isRunning1} style={[styles.timerBtn, !isRunning1 && styles.timerBtnDisabled]}>
                <Ionicons name="pause" size={24} color={!isRunning1 ? theme.onDisabled : theme.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopTimer(setTimer1, setIsRunning1, interval1, 1)} style={styles.timerBtn}>
                <Ionicons name="close-circle" size={24} color={theme.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Timer droit */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>{t('breast.right')}</Text>
            <Text style={styles.timerValue}>{formatTime(timer2)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity onPress={() => startTimer(setTimer2, setIsRunning2, interval2, 2)} disabled={isRunning2} style={[styles.timerBtn, isRunning2 && styles.timerBtnDisabled]}>
                <Ionicons name="play" size={24} color={isRunning2 ? theme.onDisabled : theme.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pauseTimer(setIsRunning2, interval2, 2)} disabled={!isRunning2} style={[styles.timerBtn, !isRunning2 && styles.timerBtnDisabled]}>
                <Ionicons name="pause" size={24} color={!isRunning2 ? theme.onDisabled : theme.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopTimer(setTimer2, setIsRunning2, interval2, 2)} style={styles.timerBtn}>
                <Ionicons name="close-circle" size={24} color={theme.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.manualRow}>
          <Stepper
            label={t('breast.left')}
            value={manualLeft}
            unit={t('min')}
            chips={MIN_CHIPS}
            onChange={setManualLeft}
            max={MAX_MIN}
            theme={theme}
          />
          <Stepper
            label={t('breast.right')}
            value={manualRight}
            unit={t('min')}
            chips={MIN_CHIPS}
            onChange={setManualRight}
            max={MAX_MIN}
            theme={theme}
          />
        </View>
      )}
      </>
      )}
    </View>
  );
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  modeRow: {
    width: FORM_WIDTH,
    flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10,
  },
  modeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: theme.accent },
  modeButtonSelected: { backgroundColor: theme.primary },
  modeText: { fontSize: 14, fontWeight: '600', color: theme.accent },
  modeTextSelected: { color: theme.onPrimary },
  timerContainer: { alignItems: 'center', backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  timerLabel: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 },
  timerValue: { fontSize: 28, fontWeight: 'bold', color: theme.accent, marginBottom: 10 },
  timerButtons: { flexDirection: 'row', gap: 12 },
  timerBtn: { backgroundColor: theme.primary, borderRadius: 8, padding: 10 },
  timerBtnDisabled: { backgroundColor: theme.disabled },
  manualRow: {
    width: FORM_WIDTH,
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, gap: 10,
  },
  pumpingForm: { width: FORM_WIDTH },
  pumpedTotal: {
    textAlign: 'center', fontSize: 13.5, fontWeight: '600',
    color: theme.textSecondary, marginTop: 4, marginBottom: 8,
  },

  // Sélecteur de nature d'acte — même gabarit que le choix de saisie, teinte plus douce
  // pour que la hiérarchie entre les deux rangées reste lisible.
  typeButton: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.soft,
  },
  typeButtonSelected: { backgroundColor: theme.primary, borderColor: theme.accent },
  typeText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  typeTextSelected: { color: theme.onPrimary },

  stepperColumn: { flex: 1, alignItems: 'center', gap: 8 },
  stepperLabel: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
  stepperValue: { fontSize: 28, fontWeight: 'bold', color: theme.accent },
  stepperValueCompact: { fontSize: 22 },
  stepperUnit: { fontSize: 14, fontWeight: '600' },
  stepperButtons: { flexDirection: 'row', gap: 12 },
  stepperBtn: {
    backgroundColor: theme.primary, borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { backgroundColor: theme.disabled },

  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3,
    alignSelf: 'stretch',
  },
  chip: {
    paddingVertical: 5, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center',
    backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.border,
  },
  chipSelected: { backgroundColor: theme.primary, borderColor: theme.accent },
  chipText: { fontSize: 11.5, fontWeight: '600', color: theme.textSecondary },
  chipTextSelected: { color: theme.onPrimary },

});

export default BreastfeedingSection;
