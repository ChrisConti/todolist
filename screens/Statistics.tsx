import { View, Text, StyleSheet } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import AllComponent from '../stats/All';
import { onSnapshot, query, where } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import Analytics from '../services/analytics';

export default function Statistics({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, babyID }: any = useContext(AuthentificationUserContext);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => { Analytics.logScreenView('Statistics'); }, []);

  useEffect(() => {
    if (!user || !babyID) { setTasks([]); return; }

    // Query by babyID directly so multi-baby users always get the right data
    const babyQuery = query(babiesRef, where('id', '==', babyID));
    const unsubscribe = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentTasks = (babyData.tasks || []).filter((task: any) =>
            new Date(task.date) >= sevenDaysAgo
          );
          setTasks(recentTasks);
        } else {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    }, () => setTasks([]));

    return () => unsubscribe();
  }, [babyID, user]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{t('title.stats') || 'Statistiques'}</Text>
      </View>
      <View style={styles.content}>
        <AllComponent tasks={tasks} navigation={navigation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF1E7' },
  header: {
    backgroundColor: '#C75B4A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F6F0EB',
    fontFamily: 'Pacifico',
  },
  content: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
});
