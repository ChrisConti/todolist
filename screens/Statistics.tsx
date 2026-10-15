import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import React, { useMemo, useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import AllComponent from '../stats/All';
import { onSnapshot, query, where } from 'firebase/firestore';
import { babiesRef } from '../config';
import { useTranslation } from 'react-i18next';
import Analytics from '../services/analytics';
import Stork from '../assets/parachute2.svg';

export default function Statistics({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.onPrimary,
    fontFamily: 'Pacifico',
  },
  content: {
    flex: 1,
    backgroundColor: theme.background,
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
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: theme.card,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
