import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { onSnapshot, query, where } from 'firebase/firestore';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { babiesRef } from '../config';
import BiberonComponent from '../stats/Biberon';
import DiaperComponent from '../stats/Diaper';
import SommeilComponent from '../stats/Sommeil';
import ThermoComponent from '../stats/Thermo';
import AllaitementComponent from '../stats/Allaitement';

const CATEGORY_META: Record<number, { title: string; color: string }> = {
  0: { title: 'Biberon',      color: '#34777B' },
  1: { title: 'Couches',      color: '#C75B4A' },
  3: { title: 'Sommeil',      color: '#E29656' },
  4: { title: 'Température',  color: '#4F469F' },
  5: { title: 'Allaitement',  color: '#1AAAAA' },
};

export default function CategoryDetail({ navigation, route }: any) {
  const { categoryId } = route.params as { categoryId: number };
  const meta = CATEGORY_META[categoryId] ?? { title: 'Détail', color: '#C75B4A' };

  const insets = useSafeAreaInsets();
  const { user, babyID } = useContext(AuthentificationUserContext) as any;
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !babyID) { setLoading(false); return; }

    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));
    const unsub = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData?.id === babyID) {
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
    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={meta.color} />;
    switch (categoryId) {
      case 0: return <BiberonComponent tasks={tasks} navigation={navigation} />;
      case 1: return <DiaperComponent tasks={tasks} navigation={navigation} />;
      case 3: return <SommeilComponent tasks={tasks} navigation={navigation} />;
      case 4: return <ThermoComponent tasks={tasks} navigation={navigation} />;
      case 5: return <AllaitementComponent tasks={tasks} navigation={navigation} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: meta.color, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#F6F0EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{meta.title}</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F6F0EB' },
});
