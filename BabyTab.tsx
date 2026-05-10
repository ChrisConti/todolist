import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import { babiesRef, db, userRef, storage } from './config';
import { getDocs, getDocsFromServer, query, where, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from './services/analytics';
import Stork from './assets/parachute2.svg';
import BabyProfileTab from './BabyProfileTab';
import BabyFamilyTab from './BabyFamilyTab';

const BabyTab = ({ navigation }) => {
  const { user, babyID, setBabyID, userInfo } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'profile' | 'family'>('profile');
  const [loading, setLoading] = useState(false);
  const [babyData, setBabyData] = useState<any>(null);
  const [babyDocId, setBabyDocId] = useState<string>('');
  const [userListDisplay, setUserListDisplay] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !babyID) {
        setBabyData(null);
        setLoading(false);
        return;
      }
      loadBabyAndUsers();
    }, [babyID, user])
  );

  const loadBabyAndUsers = async () => {
    setLoading(true); // toujours afficher le spinner pendant le chargement

    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      // Force fetch from server (no cache)
      const querySnapshot = await getDocsFromServer(queryResult);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setBabyData(data);
        setBabyDocId(querySnapshot.docs[0].id);

        // Load users — query each member individually to avoid 'in' edge cases
        if (data.user && data.user.length > 0) {
          const memberUids: string[] = data.user;
          const results: any[] = [];

          await Promise.all(
            memberUids.map(async (uid) => {
              try {
                const q = query(userRef, where('userId', '==', uid));
                const snap = await getDocsFromServer(q);
                if (!snap.empty) {
                  results.push(snap.docs[0].data());
                } else if (uid === user.uid) {
                  // Current user has no Users doc — build from auth object
                  results.push({
                    userId: user.uid,
                    username: user.displayName || user.email?.split('@')[0] || user.email || '',
                    email: user.email || '',
                  });
                }
              } catch {
                if (uid === user.uid) {
                  results.push({
                    userId: user.uid,
                    username: user.displayName || user.email?.split('@')[0] || user.email || '',
                    email: user.email || '',
                  });
                }
              }
            })
          );

          // Preserve original order (same as memberUids)
          const ordered = memberUids
            .map((uid) => results.find((r) => r.userId === uid))
            .filter(Boolean);
          setUserListDisplay(ordered);
        }
      } else {
        setBabyData(null);
      }
    } catch (error) {
      console.error('Error loading baby and users:', error);
      setBabyData(null);
    } finally {
      setLoading(false);
    }
  };

  const removeUserFromBaby = async () => {
    if (!user || !user.uid) {
      console.error('Cannot remove user: user not authenticated');
      return;
    }
    
    try {
      const queryResult = query(babiesRef, where('user', 'array-contains', user.uid));
      const querySnapshot = await getDocsFromServer(queryResult);

      if (querySnapshot.empty) {
        return;
      }

      const updatePromises = querySnapshot.docs.map(async (document) => {
        await updateDoc(doc(db, 'Baby', document.id), {
          user: arrayRemove(user.uid),
          premiumUserIds: arrayRemove(user.uid),
        });
      });

      await Promise.all(updatePromises);
      setBabyID(null);

      try {
        analytics.logEvent('baby_left', {
          baby_id: babyID,
          user_id: user.uid,
          timestamp: Date.now()
        });
      } catch {
        // Non-critical — don't block leave if analytics throws
      }
      
      // Clean activity review prompt counters for this user
      try {
        const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
        await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
        if (!hasReviewed) {
          await AsyncStorage.removeItem(`review_last_shown_${user.uid}`);
        }
      } catch (storageError) {
        console.error('Error cleaning AsyncStorage:', storageError);
      }
    } catch (error) {
      console.error('Error removing user from baby:', error.message);
    }
  };

  const deleteBaby = () => {
    Alert.alert(
      t('settings.deleteBabyTitle'),
      t('settings.deleteBabyMessage'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.confirm'),
          onPress: async () => {
            try {
              // Delete photo from storage if exists
              if (babyData.photo) {
                try {
                  const storageRef = ref(storage, `babies/${babyID}/profile.jpg`);
                  await deleteObject(storageRef);
                  console.log('Baby photo deleted from storage');
                } catch (deleteError) {
                  console.log('Error deleting baby photo:', deleteError);
                }
              }
              await removeUserFromBaby();
            } catch (error) {
              console.error('Error deleting baby:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditBaby', { babyData });
  };

  // Spinner : premier chargement uniquement (pas de données en cache)
  if (loading && !babyData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C75B4A" />
      </View>
    );
  }

  // Pas de bébé → proposer créer / rejoindre
  if (!babyID) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.headerTitle}>{t('baby.title') || 'Mon Bébé'}</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <Stork height={180} width={180} />
            <View style={{ height: 30 }} />
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => {
                const parentNav = navigation.getParent();
                if (parentNav) {
                  parentNav.navigate('CreateBaby');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>{t('title.addBaby')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                const parentNav = navigation.getParent();
                if (parentNav) {
                  parentNav.navigate('JoinBaby');
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>{t('settings.joinBaby')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // babyID setté mais données pas encore disponibles (query vide ou erreur Firestore)
  if (!babyData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C75B4A" />
      </View>
    );
  }

  // Baby exists - show profile with tabs
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{babyData.name || t('baby.title')}</Text>
      </View>
      
      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => { setActiveTab('profile'); analytics.logEvent('tab_selected', { screen: 'Baby', tab: 'profile' }); }}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            {t('baby.profile')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'family' && styles.activeTab]}
          onPress={() => { setActiveTab('family'); analytics.logEvent('tab_selected', { screen: 'Baby', tab: 'family' }); }}
        >
          <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>
            {t('baby.family')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' ? (
        <BabyProfileTab babyData={babyData} onEdit={handleEdit} />
      ) : (
        <BabyFamilyTab
          babyID={babyID}
          babyDocId={babyDocId}
          usersList={userListDisplay}
          memberRoles={babyData.memberRoles || {}}
          currentUserId={user.uid}
          adminId={babyData.admin}
          onLeaveBaby={deleteBaby}
          onRoleUpdated={loadBabyAndUsers}
        />
      )}
    </View>
  );
};

export default BabyTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  header: {
    backgroundColor: '#C75B4A',
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FDF1E7',
    fontFamily: 'Pacifico',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF1E7',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#C75B4A',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7A8889',
  },
  activeTabText: {
    color: '#C75B4A',
  },
  scrollView: {
    flex: 1,
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7A8889',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: 250,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C75B4A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: 250,
  },
  secondaryButtonText: {
    color: '#C75B4A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
