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

const Baby = ({navigation}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState(0);
    const [birth, setBirth] = useState('');
    const uniqueId = uuid.v4();
    const newEntities = [];
    const [userList, setUserList] = useState([])
    const [admin, setAdmin] = useState(false)
    const [babyUidAdmin, setbabyUidAdmin] = useState(false)

    const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

    const images = [
        {id: 0, type: 'Boy', rq: require('./assets/boy.png')},
        {id: 1, type: 'Girl', rq: require('./assets/girl.png')},
      ];

      useEffect(()=> {
        if(!user) return

        const getBabyInfo = onSnapshot(babiesRef, (querySnapshot) => {
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
                  console.log(userUid)
                  const userQuery = query(collection(db, 'Users'), where('userId', '==', userUid)); 
                  const userDocs = await getDocs(userQuery); 
                  userDocs.forEach((userDoc) => { 
                    console.log(userDoc.data())
                    newEntities.push(userDoc.data()); 
                  }); 
                }
                console.log(newEntities)
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
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>
        <ScrollView>
            
            <View>
              <View style={{flexDirection:"row", justifyContent:'center'}}>
                {type == 0 ?
                    <Image source={require('./assets/boy.png')} style={styles.image} />              
              :
                    <Image source={require('./assets/girl.png')} style={styles.image} />  

              }
              </View>              
            
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    autoCapitalize="none"
                    value={name}
                    onChangeText={(text) => setName(text)}
                    editable = {false}
                    />
                </View>

                <View>
                    <Text style={styles.titleParameter}>
                        Liste d'utilisateur 
                    </Text>
                    <View style={{}}>
                      {userList.map((u) => (
                        <View key={u.userId} style={{flexDirection:'row', justifyContent:'space-around', paddingBottom:10}}>
                          <Text>{u.username}</Text>
                          <Text>{u.email}</Text>
                          <Text>{u.role}</Text>
                          {user.uid == babyUidAdmin && u.userId != babyUidAdmin ? 
                          <TouchableOpacity style={{}} onPress={()=> Clipboard.setString(babyID)}>
                              <FontAwesome name={'times-circle'} size={15} style={{color: '#46B0FC'}} />
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
                        Partager le bébé 
                    </Text>
                    
                      <TouchableOpacity style={{paddingBottom:8, backgroundColor:'#46B0FC', borderRadius:6, }} onPress={()=> Clipboard.setString(babyID)}>
                      <View style={{flexDirection:'row', alignContent:'space-around', justifyContent:'center' }}>
                          <Text>
                              Copier le code : 
                          </Text>
                          <Copy height={20} width={20} />
                        </View>
                      </TouchableOpacity>
                    
                    
                    <Text>
                        Voici un code à communiquer à vos amis, pour rejoindre votre bébé.
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
              }}>
              <Text style={styles.buttonText}>Quitter le bébé</Text>
            </TouchableOpacity>
          </View>
    </View>
  )
}

const styles = StyleSheet.create({

    image: {
      width: 50,
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
        borderColor: '#46B0FC',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 20,
        backgroundColor: 'white', // White input background
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
        backgroundColor: '#46B0FC', // Dark blue button background
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


/*
<View style={{flexDirection:'row'}}>
                <TouchableOpacity onPress={()=> {
                    setSelectedCreation('Creation')
                }}
                style={[selectedCreation == 'Creation' ? styles.buttonSelected : styles.buttonUnSelected]}>
                    <Text>
                        Creation
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> {
                    setSelectedCreation('Join')
                }}
                style={[selectedCreation == 'Join' ? styles.buttonSelected : styles.buttonUnSelected]}>
                    <Text>
                        Joindre
                    </Text>
                </TouchableOpacity>
            </View>*/