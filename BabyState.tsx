import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import analytics from './services/analytics';
import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { babiesRef, db, userRef, storage } from './config';
import { arrayRemove, doc, getDocs, getDocsFromServer, query, updateDoc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import BabyProfileTab from './BabyProfileTab';
import BabyFamilyTab from './BabyFamilyTab';

const BabyState = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const [activeTab, setActiveTab] = useState<'profile' | 'family'>('profile');
  const [babyData, setBabyData] = useState<any>(null);
  const [userListDisplay, setUserListDisplay] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recharger les données à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    useCallback(() => {
      if (user && babyID) {
        loadBabyAndUsers();
      }
    }, [user, babyID])
  );

  const loadBabyAndUsers = async () => {
    setLoading(true);

    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      // Force fetch from server to get fresh data (not from cache)
      const querySnapshot = await getDocsFromServer(queryResult);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setBabyData(data);
        
        // Load users directly
        if (data.user && data.user.length > 0) {
          const usersQuery = query(userRef, where('userId', 'in', data.user));
          const usersSnapshot = await getDocs(usersQuery);
          
          const users = usersSnapshot.docs.map((doc) => doc.data());
          setUserListDisplay(users);
          
          if (users.length === 0) {
            console.warn('⚠️ No User documents found for IDs:', data.user);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading baby and users:', error);
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
      const querySnapshot = await getDocs(queryResult);

      if (querySnapshot.empty) {
        console.log('No babies found for this user.');
        return;
      }

      const updatePromises = querySnapshot.docs.map(async (document) => {
        await updateDoc(doc(db, 'Baby', document.id), {
          user: arrayRemove(user.uid),
        });
      });

      await Promise.all(updatePromises);
      setBabyID(null);
      
      // Log analytics event for leaving baby
      analytics.logEvent('baby_left', {
        baby_id: babyID,
        user_id: user.uid,
        timestamp: Date.now()
      });
      
      // Clean activity review prompt counters for this user
      try {
        const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
        await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
        await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
        await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
        if (hasReviewed !== 'true') {
          await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
        }
        await AsyncStorage.removeItem('task_created_count');
        await AsyncStorage.removeItem('last_review_prompt_at_count');
        await AsyncStorage.removeItem('has_prompted_for_review');
        const oldHasReviewed = await AsyncStorage.getItem('has_reviewed_app');
        if (oldHasReviewed !== 'true') {
          await AsyncStorage.removeItem('has_reviewed_app');
        }
        console.log('✅ Review counters cleaned for user:', user.uid);
      } catch (storageError) {
        console.warn('⚠️ Failed to clean review counters:', storageError);
      }
      
      console.log('User successfully removed from all babies.');
    } catch (error) {
      console.error('Error removing user from baby:', error);
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
              // Si c'est l'admin qui supprime le bébé, supprimer la photo
              if (babyData?.admin === user.uid && babyData?.profilePhoto) {
                try {
                  const storageRef = ref(storage, `babies/${babyID}/profile.jpg`);
                  await deleteObject(storageRef);
                  console.log('Baby photo deleted from storage');
                } catch (deleteError) {
                  console.log('Error deleting baby photo:', deleteError);
                }
              }
              await removeUserFromBaby();
              navigation.navigate('MainTabs');
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

  if (loading || !babyData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            {t('baby.profile')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'family' && styles.activeTab]}
          onPress={() => setActiveTab('family')}
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
          usersList={userListDisplay}
          currentUserId={user.uid}
          adminId={babyData.admin}
          onLeaveBaby={deleteBaby}
        />
      )}
    </View>
  );
};

export default BabyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
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
});
