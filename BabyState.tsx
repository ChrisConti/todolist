import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Clipboard } from 'react-native';
import analytics from './services/analytics';
import React, { useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { babiesRef, db, userRef } from './config';
import { arrayRemove, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import Copy from './assets/copy.svg';
import { FontAwesome } from '@expo/vector-icons';

const Baby = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, babyID, usersList, setBabyID, setUsersList } = useContext(AuthentificationUserContext);
  const [name, setName] = useState('');
  const [type, setType] = useState(0);
  const [userListDisplay, setUserListDisplay] = useState([]);

  useEffect(() => {
    if (!user || !babyID) return;
    loadBabyAndUsers();
  }, []);

  const loadBabyAndUsers = async () => {
    console.log('🔍 Loading baby and users, babyID:', babyID);
    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      const querySnapshot = await getDocs(queryResult);
      
      if (!querySnapshot.empty) {
        const babyData = querySnapshot.docs[0].data();
        setName(babyData.name);
        setType(babyData.type === 'Boy' ? 0 : 1);
        
        // Load users directly
        if (babyData.user && babyData.user.length > 0) {
          const usersQuery = query(userRef, where('userId', 'in', babyData.user));
          const usersSnapshot = await getDocs(usersQuery);
          
          const users = usersSnapshot.docs.map((doc) => doc.data());
          setUserListDisplay(users);
          
          if (users.length === 0) {
            console.warn('⚠️ No User documents found for IDs:', babyData.user);
            console.warn('This should have been created during signup/login');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading baby and users:', error);
    }
  };

  const getBabyInfo = async () => {
    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach((doc) => {
        const babyData = doc.data();
        setName(babyData.name);
        setType(babyData.type === 'Boy' ? 0 : 1);
      });
    } catch (error) {
      console.error('Error fetching baby info:', error);
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
        babyId: babyID,
        userId: user.uid,
        timestamp: Date.now()
      });
      
      // Clean activity review prompt counters for this user
      // But keep has_reviewed_app if user already reviewed
      try {
        const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
        await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
        await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
        await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
        // Only remove has_reviewed if user hasn't reviewed yet
        if (hasReviewed !== 'true') {
          await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
        }
        // Anciennes clés globales pour compatibilité (but preserve has_reviewed_app)
        await AsyncStorage.removeItem('task_created_count');
        await AsyncStorage.removeItem('last_review_prompt_at_count');
        await AsyncStorage.removeItem('has_prompted_for_review');
        const oldHasReviewed = await AsyncStorage.getItem('has_reviewed_app');
        if (oldHasReviewed !== 'true') {
          await AsyncStorage.removeItem('has_reviewed_app');
        }
        console.log('✅ Review counters cleaned for user:', user.uid, 'preserved has_reviewed:', hasReviewed === 'true');
      } catch (storageError) {
        console.warn('⚠️ Failed to clean review counters:', storageError);
        // Ne pas bloquer la suppression du bébé si le nettoyage échoue
      }
      
      console.log('User successfully removed from all babies.');
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
              await removeUserFromBaby();
              navigation.navigate('BabyList');
            } catch (error) {
              console.error('Error deleting baby:', error);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    analytics.logEvent('baby_code_copied', {
      babyId: babyID,
      userId: user.uid
    });
    Alert.alert(t('success.copied'));
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.centeredRow}>
          {type === 0 ? <Boy height={90} width={90} /> : <Girl height={90} width={90} />}
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('Name')}
          value={name}
          editable={false}
          accessibilityLabel={t('accessibility.babyName')}
        />
        <Text style={styles.titleParameter}>{t('Liste d\'utilisateur')}</Text>
        {userListDisplay.map((u) => (
          <View key={u.userId} style={styles.userRow}>
            <Text>{u.username}</Text>
            <Text>{u.email}</Text>
            <Text>{u.role === 'autre' ? u.roleAutre : u.role}</Text>
            {user.uid === babyID && u.userId !== babyID && (
              <TouchableOpacity onPress={() => copyToClipboard(babyID)}>
                <FontAwesome name="times-circle" size={15} color="#C75B4A" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <Text style={styles.titleParameter}>{t('Partager le bébé')}</Text>
        <TouchableOpacity style={{}} onPress={()=> copyToClipboard(babyID)}>
        <View style={{flexDirection:'row',alignContent:'center', justifyContent:'space-around', width:180 ,  backgroundColor:'#C75B4A', borderRadius:6,height:50, alignSelf:'center'}}>
                    
                    <Text style={{color:'white', paddingRight:5, alignSelf:'center'}}>
                        {t('Copier le code')} 
                    </Text>
                    <View style={{paddingLeft:5, alignSelf:'center'}}>
                      <Copy height={20} width={20} />
                    </View>
                    
                    
                  </View>
                          </TouchableOpacity>
        <Text>{t('Voici un code à communiquer à vos amis, pour rejoindre votre bébé.')}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={deleteBaby}>
          <Text style={styles.buttonText}>{t('Quitter le bébé')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Baby;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#FDF1E7' },
  centeredRow: { flexDirection: 'row', justifyContent: 'center' },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  titleParameter: { color: '#7A8889', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  userRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 10 },
  copyButton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#C75B4A',
    borderRadius: 6,
    height: 50,
    alignSelf: 'center',
    paddingHorizontal: 10,
  },
  copyButtonText: { color: 'white', paddingRight: 5 },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: 250,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});