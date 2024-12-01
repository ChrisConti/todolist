import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet, Alert } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db, userRef } from './config'
import { AuthentificationUserContext } from './Context/AuthentificationContext'
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from "react-native-chart-kit";

const ChangeName = ({route, navigation}) => {
  const {user, userInfo} = useContext(AuthentificationUserContext);
  const [name, setName] = useState(userInfo.username)
  const [userError, setError] = useState('');
  console.log(user)

  
const queryResult = query(userRef, where('userId', '==', user.uid));

const onHandleModification = async () => {
  if (!name ) {
    setError('Please enter a valid name');
    return;
  }
  //console.log(JSON.stringify(babyID))
  const queryResult = query(userRef, where('userId', '==', user.uid))
  //console.log('queryResult :' + user.uid)
  try {
    const querySnapshot = await getDocs(queryResult);
    querySnapshot.forEach(async (document) => {
      console.log(document)
      await updateDoc(doc(db, 'Users', document.id),{
        username:name, 
      }).then(() => {
        console.log('success')
        Alert.alert('Modification', 'Ton nouveau a bien été pris en compte.', [
          {
            text: 'ok',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {},
        ]);
      });
    })

    //navigation.navigate('BabyList')

  } catch (error) {
    console.error('Error updating document:', error);
  }
}

  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>

      <TextInput
        style={styles.input}
        placeholder="Name"
        keyboardType="email-address"
        autoCapitalize="none"
        clearButtonMode='always'
        value={name}
        onChangeText={(text) => setName(text)}
      />
      <View>
          <Text style={styles.errorText}>{userError}</Text>
      </View>

      {/* Validation Button */}
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
        <TouchableOpacity style={styles.button} onPress={onHandleModification}>
          <Text style={styles.buttonText}>Validated</Text>
        </TouchableOpacity>
      </View>


    </View>

    


  )

}

export default ChangeName

const styles = StyleSheet.create({
  container: {
    flex:1, padding:10, backgroundColor:'white'
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  }
  

});
