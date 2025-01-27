import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Pressable, Alert, Clipboard } from 'react-native'
import React, { useContext, useEffect, useRef, useState } from 'react'
import s from "./Style.js";
import { auth, babiesRef, db, userRef } from './config';
import { FieldValue, addDoc, arrayRemove, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import AuthentificationUserProvider, {AuthentificationUserContext} from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';
import Copy from './assets/copy.svg';
import { FontAwesome } from '@expo/vector-icons'; // Import FontAwesome icons
import { useTranslation } from 'react-i18next'; // Import i18n
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';

const Baby = ({navigation}) => {
    const { t, i18n } = useTranslation(); // Initialize i18n
    const [name, setName] = useState('');
    const [type, setType] = useState(0);
    const [birth, setBirth] = useState('');
    const uniqueId = uuid.v4();
    
    const [userList, setUserList] = useState([])
    const [admin, setAdmin] = useState(false)
    const [babyUidAdmin, setbabyUidAdmin] = useState(false)

    const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

      const roles = [
        { label: t('roles.papa'), value: 'papa' },
        { label: t('roles.maman'), value: 'maman' },
        { label: t('roles.nounou'), value: 'nounou' },
        { label: t('roles.papi'), value: 'papi' },
        { label: t('roles.mami'), value: 'mami' },
        { label: t('roles.autre'), value: 'autre' },
    ];

      useEffect(()=> {
        if(!user) return
        const newEntities = [];
        const babyQuery = query(babiesRef, where('user', 'array-contains', user.uid));
        const getBabyInfo = onSnapshot(babyQuery, (querySnapshot) => {
            querySnapshot.forEach(async (doc) => {
              // Access individual document data
              const babyData = doc.data();
              if(babyData.id === babyID){
                setName(babyData.name)
                setBirth(babyData.birth)
                setType(babyData.type == "Boy" ? 0 : 1)
                setbabyUidAdmin(babyData.admin)

                // Fetch details for each user UID 
                for (const userUid of babyData.user) { 
                 // console.log(userUid)
                  const userQuery = query(collection(db, 'Users'), where('userId', '==', userUid)); 
                  const userDocs = await getDocs(userQuery); 
                  userDocs.forEach((userDoc) => { 
                    //console.log(userDoc.data())
                    newEntities.push(userDoc.data()); 
                  }); 
                }
                //console.log(newEntities)
                setUserList(newEntities)
                
              }
            });
          });
        
          return () => {
            getBabyInfo();
            //getUsers();
          };
      },[])
      
      const removeUserFromBaby = async () => { 
        try {
          // Reference to the babies collection          
          // Query the collection for the specific baby document
          const q = query(babiesRef, where('id', '==', babyID));
          const querySnapshot = await getDocs(q);
      
          // Check if the baby document exists
          if (querySnapshot.empty) {
            console.error('Baby document does not exist');
            return;
          }
      
          // Get the baby document reference
          const babyDocRef = querySnapshot.docs[0].ref;
      
          // Get the current user array
          const currentData = querySnapshot.docs[0].data();
          const userArray = currentData.user;
      
          console.log(`Current number of users in Baby ${babyID}: ${userArray.length}`);
      
          // Update the user array by removing the userUid
          await updateDoc(babyDocRef, {
            user: arrayRemove(user.uid)
          });
      
          console.log(`User ${user.uid} successfully removed from Baby ${babyID}`);
      
          // Get the updated document data
          const updatedSnapshot = await getDocs(q);
          const updatedUserArray = updatedSnapshot.docs[0].data().user;
      
          console.log(`Updated number of users in Baby ${babyID}: ${updatedUserArray.length}`);
          setBabyID(null)
          
          
        } catch (error) { 
          console.error('Error removing user from baby:', error.message); 
        } 
      };      

  return (
    <View style={{flex:1, padding:10, backgroundColor:'#FDF1E7'}}>
        <ScrollView>
            <View>
              <View style={{flexDirection:"row", justifyContent:'center'}}>
                {type == 0 ?
                    <Boy height={90} width={90} />             
              :
                    <Girl height={90} width={90} /> 
              }
              </View>              
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('Name')}
                    autoCapitalize="none"
                    value={name}
                    onChangeText={(text) => setName(text)}
                    editable = {false}
                    />
                </View>

                <View>
                    <Text style={styles.titleParameter}>
                        {t('Liste d\'utilisateur')}
                    </Text>
                    <View style={{}}>
                      {userList.map((u) => (
                        <View key={u.userId} style={{flexDirection:'row', justifyContent:'space-around', paddingBottom:10}}>
                          <Text>{u.username}</Text>
                          <Text>{u.email}</Text>
                          <Text>{u.role === 'autre'? u.roleAutre : u.role}</Text>
                          {user.uid == babyUidAdmin && u.userId != babyUidAdmin ? 
                          <TouchableOpacity style={{}} onPress={()=> Clipboard.setString(babyID)}>
                              <FontAwesome name={'times-circle'} size={15} style={{color: '#C75B4A'}} />
                          </TouchableOpacity>
                        :
                        ''
                        }
                        </View>
                      ))}
                    </View>
                </View>
                
                 <View>
                    <Text style={styles.titleParameter}>
                        {t('Partager le bébé')}
                    </Text>
                    
                    <TouchableOpacity style={{ }} onPress={()=> Clipboard.setString(babyID)}>
                      <View style={{flexDirection:'row',alignContent:'center', justifyContent:'space-around', width:180 ,  backgroundColor:'#C75B4A', borderRadius:6,height:50, alignSelf:'center'}}>
                        
                          <Text style={{color:'white', paddingRight:5, alignSelf:'center'}}>
                              {t('Copier le code')} 
                          </Text>
                          <View style={{paddingLeft:5, alignSelf:'center'}}>
                            <Copy height={20} width={20} />
                          </View>
                          
                          
                        </View>
                        </TouchableOpacity>
                      
                    
                    
                    
                 </View>
                 <View style={{marginTop:10}}>
                 <Text>
                        {t('Voici un code à communiquer à vos amis, pour rejoindre votre bébé.')}
                    </Text>
                 </View>

            </View>

        </ScrollView>
            <View style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
            alignItems: 'center',
            justifyContent: 'flex-end', // Pushes the button to the bottom
            flexDirection:'column',
            
          }}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={()=> {
                removeUserFromBaby()
                //onHandleLeaveBaby()
                navigation.navigate("BabyList");
                setBabyID(null)
              }}>
              <Text style={styles.buttonText}>{t('Quitter le bébé')}</Text>
            </TouchableOpacity>
          </View>
    </View>
  )
}


const styles = StyleSheet.create({

    image: {
      width: 70,
      height: 50,
      resizeMode: 'cover',
      
    },
    imageSelected: {
      width: 90,
                  height: 90,
                  resizeMode: 'cover',
                  borderColor: '#0074D9',
                  borderWidth:5,
                  borderRadius:60, 
                  justifyContent:'center',
                  alignItems:'center',
                  flexDirection:"row", 
    },
    imageNonSelected: {
      width: 90,
                  height: 90,
                  resizeMode: 'cover',
                  borderWidth:5,
                  borderRadius:60, 
                  justifyContent:'center',
                  alignItems:'center',
                  borderColor: 'transparent',
                  flexDirection:"row", 
    },
    input: {
      width: '100%',
        height: 50,
        borderBottomWidth: 1,
        borderColor: '#C75B4A',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 20,
       
    },
    buttonSelected: {
        backgroundColor: '#0074D9', // Blue color
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3, // Android shadow
        
      },
      buttonUnSelected: {
        backgroundColor: 'white', // Blue color
        borderWidth:3,
        borderColor:'grey',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3, // Android shadow
        
      },
      button: {
        backgroundColor: '#C75B4A', // Dark blue button background
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
        width:250
      },
      buttonText: {
        color: '#fff', // White text color
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      titleParameter:{
        color: '#7A8889', // White text color
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom:5,
        marginTop:3,
        paddingBottom:4
    }
  });

export default Baby
