import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import AllComponent from '../stats/All';
import { onSnapshot, query, where } from 'firebase/firestore';
import { babiesRef } from '../config';

export default function Statistics({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, babyID }: any = useContext(AuthentificationUserContext);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !babyID) { setTasks([]); return; }

    const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData?.id === babyID) {
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
        <Text style={styles.headerTitle}>Statistiques</Text>
      </View>
      <ScrollView style={styles.content}>
        <AllComponent tasks={tasks} navigation={navigation} />
      </ScrollView>
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
    padding: 10,
    backgroundColor: '#FDF1E7',
  },
});
