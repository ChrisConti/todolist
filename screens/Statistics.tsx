import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import AllComponent from '../stats/All';
import { onSnapshot, query, where } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import Analytics from '../services/analytics';
import Stork from '../assets/parachute2.svg';

export default function Statistics({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, babyID }: any = useContext(AuthentificationUserContext);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => { Analytics.logScreenView('Statistics'); }, []);

  useEffect(() => {
    if (!user || !babyID) { setTasks([]); return; }

    const babyQuery = query(babiesRef, where('id', '==', babyID));
    const unsubscribe = onSnapshot(babyQuery, (snap) => {
      if (!snap.empty) {
        const babyData = snap.docs[0]?.data();
        if (babyData) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const recentTasks = (babyData.tasks || []).filter((task: any) =>
            new Date(task.date) >= ninetyDaysAgo
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
        <Text style={styles.headerTitle}>{t('title.stats')}</Text>
      </View>
      <View style={styles.content}>
        {!babyID ? (
          <ScrollView contentContainerStyle={styles.emptyStateContainer}>
            <View style={styles.emptyState}>
              <Stork height={180} width={180} />
              <View style={{ height: 20 }} />
              <Text style={styles.emptyTitle}>{t('stats.noBabyTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('stats.noBabySubtitle')}</Text>
              <View style={{ height: 24 }} />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  const parentNav = navigation.getParent();
                  if (parentNav) parentNav.navigate('CreateBaby');
                }}
              >
                <Text style={styles.primaryButtonText}>{t('title.addBaby')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  const parentNav = navigation.getParent();
                  if (parentNav) parentNav.navigate('JoinBaby');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('settings.joinBaby')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <AllComponent tasks={tasks} navigation={navigation} />
        )}
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
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    width: '100%',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7A8889',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#C75B4A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#C75B4A',
    fontSize: 16,
    fontWeight: '600',
  },
});
