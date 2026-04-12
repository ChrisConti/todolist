import React, { useContext, useEffect, useState } from 'react';
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

const CATEGORY_COLORS: Record<number, string> = {
  0: '#34777B',
  1: '#C75B4A',
  3: '#E29656',
  4: '#4F469F',
  5: '#1AAAAA',
};

export default function CategoryDetail({ navigation, route }: any) {
  const { t } = useTranslation();
  const { categoryId } = route.params as { categoryId: number };
  const color = CATEGORY_COLORS[categoryId] ?? '#C75B4A';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !babyID) { setLoading(false); return; }

    // Query by babyID directly so multi-baby users always get the right data
    const babyQuery = query(babiesRef, where('id', '==', babyID));
    const unsub = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const filtered = (babyData.tasks || []).filter((t: any) =>
            t.id === categoryId && new Date(t.date) >= sevenDaysAgo
          );
          setTasks(filtered);
        }
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [babyID, user, categoryId]);

  const renderContent = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={color} />;
    switch (categoryId) {
      case 0: navigation.replace('BiberonInsights'); return null;
      case 1: return <DiaperComponent tasks={tasks} navigation={navigation} />;
      case 3: return <SommeilComponent tasks={tasks} navigation={navigation} />;
      case 4: return <ThermoComponent tasks={tasks} navigation={navigation} />;
      case 5: return <AllaitementComponent tasks={tasks} navigation={navigation} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#F6F0EB" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF1E7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F6F0EB' },
});
