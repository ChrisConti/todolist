import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet, Alert } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { babiesRef, db, userRef } from './config'
import { AuthentificationUserContext } from './Context/AuthentificationContext'
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from "react-native-chart-kit";

const JoinBaby = ({route, navigation}) => {
  const {user, userInfo, babyID} = useContext(AuthentificationUserContext);
  const [babyIDPaste, setbabyIDPaste] = useState(userInfo.userbabyIDPaste)
  const [userError, setError] = useState('');
  const [babyValid, setBabyValid] = useState(false);
  console.log(user)

  
const queryResult = query(userRef, where('userId', '==', user.uid));

const onHandleModification = async () => {
  if (!babyIDPaste) {
    setError('Please enter a babyIDPaste');
    return;
  }

  //getBabies()

  if(!babyValid) {
    setError('Please enter a valid babyIDPaste');
    return;
  }

    //console.log(JSON.stringify(babyID))
    const queryResult = query(babiesRef, where('id', '==', babyIDPaste))
    console.log('queryResult :' + babyIDPaste)
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        //console.log(document)
        await updateDoc(doc(db, 'Baby', document.id),{
          user: [...document.data().user, user.uid], 
        }).then(() => {
          console.log('success')
        });
      })

      navigation.navigate('BabyList')

    } catch (error) {
      console.error('Error updating document:', error);
    }
  

  //const queryResult = query(userRef, where('userId', '==', user.uid))

  //console.log('queryResult :' + user.uid)
  
}


        const getBabies = onSnapshot(babiesRef, (querySnapshot) => {
            //console.log('snapshot baby')
            const newEntities = []
            // Handle changes here
            querySnapshot.forEach((doc) => {
              // Access individual document data
              const babyData = doc.data();
              //console.log(babyIDPaste)
              //console.log(babyData.id)
                if(babyData.id === babyIDPaste){
                    //newEntities.push(babyData);
                    //navigation.setOptions({ headerTitle: babyData.name })
                    console.log('baby found : ')
                    //console.log('baby found')
                    setBabyValid(true)
                }
            });
        }
    )


  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>

      <TextInput
        style={styles.input}
        placeholder="babyIDPaste"
        keyboardType="email-address"
        autoCapitalize="none"
        clearButtonMode='always'
        value={babyIDPaste}
        onChangeText={(text) => setbabyIDPaste(text)}
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

export default JoinBaby

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
function setBabyValid(arg0: boolean) {
    throw new Error('Function not implemented.')
}

