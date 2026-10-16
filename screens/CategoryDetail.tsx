import React, { useMemo, useContext, useEffect, useRef, useState } from 'react';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { onSnapshot, query, where } from 'firebase/firestore';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { babiesRef } from '../config';
import DiaperComponent from '../stats/Diaper';
import SommeilComponent from '../stats/Sommeil';
import ThermoComponent from '../stats/Thermo';
import AllaitementComponent from '../stats/Allaitement';
import { useTranslation } from 'react-i18next';
import Analytics from '../services/analytics';


export default function CategoryDetail({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { categoryId } = route.params as { categoryId: number };
  const headerSurface = theme.category[categoryId] ?? theme.category[1];

  const CATEGORY_TITLES: Record<number, string> = {
    0: t('stats.category.bottle'),
    1: t('stats.category.diaper'),
    3: t('stats.category.sleep'),
    4: t('stats.category.temperature'),
    5: t('stats.category.breastfeeding'),
  };
  const title = CATEGORY_TITLES[categoryId] ?? t('stats.category.detail');

  const insets = useSafeAreaInsets();
  const { user, babyID } = useContext(AuthentificationUserContext) as any;
  const [tasks, setTasks] = useState<any[]>([]);
  const [bottleTasks, setBottleTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [babyName, setBabyName] = useState<string | undefined>();
  const [babyBirthDate, setBabyBirthDate] = useState<string | undefined>();
  const enterTimeRef = useRef(Date.now());

  useEffect(() => {
    Analytics.logScreenView('StatsCategoryDetail');
    Analytics.logEvent('stats_category_opened', { category_id: categoryId });
    enterTimeRef.current = Date.now();
    return () => {
      Analytics.logEvent('stats_time_spent', {
        screen: 'CategoryDetail',
        category_id: categoryId,
        duration_sec: Math.round((Date.now() - enterTimeRef.current) / 1000),
      });
    };
  }, []);

  useEffect(() => {
    if (!user || !babyID) { setLoading(false); return; }

    // Query by babyID directly so multi-baby users always get the right data
    const babyQuery = query(babiesRef, where('id', '==', babyID));
    const unsub = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const filtered = (babyData.tasks || []).filter((t: any) =>
            t.id === categoryId && new Date(t.date) >= ninetyDaysAgo
          );
          setTasks(filtered);
          // Le bilan production/consommation de l'allaitement a besoin des
          // biberons de lait maternel, que ce filtre par catégorie écarte.
          setBottleTasks(
            categoryId === 5
              ? (babyData.tasks || []).filter((t: any) =>
                  t.id === 0 && t.milkType === 'maternal' && new Date(t.date) >= ninetyDaysAgo
                )
              : []
          );
          setBabyName(babyData.name ?? undefined);
          setBabyBirthDate(babyData.birthDate ?? undefined);
        }
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [babyID, user, categoryId]);

  const renderContent = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={theme.categoryAccent[categoryId] ?? theme.categoryAccent[1]} />;
    switch (categoryId) {
      case 0: navigation.replace('BiberonInsights'); return null;
      case 1: return <DiaperComponent tasks={tasks} navigation={navigation} />;
      case 3: return <SommeilComponent tasks={tasks} navigation={navigation} babyName={babyName} babyBirthDate={babyBirthDate} userId={user?.uid} />;
      case 4: return <ThermoComponent tasks={tasks} navigation={navigation} />;
      case 5: return <AllaitementComponent tasks={tasks} bottleTasks={bottleTasks} navigation={navigation} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerSurface, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, padding: 10 }}>
        {renderContent()}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.onPrimary },
});
