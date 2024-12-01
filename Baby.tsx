import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import s from "./Style.js";
import { auth, db, userRef } from './config';
import { FieldValue, addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import AuthentificationUserProvider, {AuthentificationUserContext} from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';

const Baby = ({navigation}) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [birth, setBirth] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedCreation, setSelectedCreation] = useState('Creation');
    const [birthdate, setBirthdate] = useState('');
    const uniqueId = uuid.v4();
    const [userErrorDate, setErrorDate] = useState('');
    const [userErrorName, setErrorName] = useState('');

    const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

    const images = [
        {id: 0, type: 'Boy', rq: require('./assets/boy.png')},
        {id: 1, type: 'Girl', rq: require('./assets/girl.png')},
      ];

      useEffect(()=> {
        if(!user) return
        
      },[])

      

      const handleCreateBaby = async () => {
  
        if (name.length < 2) {
          setErrorName('Merci de remplir le nom (min 2 caratère)');
            return;
        }
        if (birthdate.length < 8) {
          setErrorDate("Merci de remplir la date correctement.")
          return;
        }
        setBabyID(uniqueId)
        //console.log(babyID)
            await addDoc(collection(db, "Baby"), {
                id : uniqueId,
                type : images[selectedImage].type,
                name: name,
                birthDate: birth,
                CreatedDate: moment().format('YYYY-MM-DD HH:mm:ss'),
                user: [user.uid],
                tasks: [],
                role : 'Father',
                admin: user.uid
            })
            //console.log(createBaby)
            navigation.navigate('BabyList')
      }

      const handleChange = (text) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');
    
        // Add slashes after day and month
        let formatted = cleaned;
        if (cleaned.length > 2) {
          formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
          formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
        }
    
        setBirthdate(formatted);
      };

  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>
        <ScrollView>
            
            <View>
            <View style={{flexDirection:"row", justifyContent:'center', alignItems:'stretch'}}>
                    {images.map((image, index) => (
                    
                        <TouchableOpacity
                        key={index}
                        onPress={() => {
                            setSelectedImage(index)
                            //console.log(index)
                        }}
                        style={[selectedImage == image.id ? styles.imageSelected : styles.imageNonSelected]}
                        >
                            <Image key={index} source={image.rq} style={styles.image} />
                        </TouchableOpacity>
                ))}
                </View>
                
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    autoCapitalize="none"
                    value={name}
                    onChangeText={(text) => setName(text)}
                    />
                </View>
                <View>
                  <Text style={styles.errorText}>{userErrorName}</Text>
                </View>
                <View style={styles.container}>
                <TextInput
                  style={styles.input}
                  value={birthdate}
                  onChangeText={handleChange}
                  keyboardType="numeric"
                  placeholder="DD/MM/YYYY"
                  maxLength={10} // Maximum length for DD/MM/YYYY
                />
              </View>
              <View>
                  <Text style={styles.errorText}>{userErrorDate}</Text>
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
            <TouchableOpacity style={styles.button} 
            onPress={() =>{
              handleCreateBaby()
              setErrorName('')
              setErrorDate('')
            }
              
              }>
              <Text style={styles.buttonText}>Validate</Text>
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
      errorText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
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