import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Clipboard } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
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
    if (!user) return;
    getUserInfo();
    getBabyInfo();
  }, []);

  const getUserInfo = async () => {
    if (!usersList.length) return;

    const queryResult = query(userRef, where('userId', 'in', usersList));
    try {
      const querySnapshot = await getDocs(queryResult);
      const users = querySnapshot.docs.map((doc) => doc.data());
      setUserListDisplay(users);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const getBabyInfo = async () => {
    const queryResult = query(babiesRef, where('id', '==', babyID));
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach((doc) => {
        const babyData = doc.data();
        setName(babyData.name);
        setType(babyData.type);
      });
    } catch (error) {
      console.error('Error fetching baby info:', error);
    }
  };

  const removeUserFromBaby = async () => {
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
        <TouchableOpacity style={{}} onPress={()=> Clipboard.setString(babyID)}>
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