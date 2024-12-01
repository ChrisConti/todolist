import { View, Text, Button, TouchableOpacity, Dimensions, TextInput, StyleSheet } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db, userRef } from './config'
import { AuthentificationUserContext } from './Context/AuthentificationContext'
import { getAuth, sendPasswordResetEmail, updateEmail, updatePassword } from "firebase/auth";
import { auth } from './config.js';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from "react-native-chart-kit";

const ChangeEmail = ({route, navigation}) => {
  //console.log(navigation)

  const {user, setUser, babyID, setBabyID} = useContext(AuthentificationUserContext);

  function onHandleForgetPassword() {
    sendPasswordResetEmail(auth, 'christoconti@hotmail.fr')
  .then(() => {
    // Password reset email sent!
    // ..
    console.log('success')
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ..
  });

  }

  

  return (
    <View style={{flex:1, padding:10, backgroundColor:'white'}}>

      <Text>
        Pour reset your password, clic on the button to receive an email.
      </Text>

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
        <TouchableOpacity style={styles.button} onPress={onHandleForgetPassword}>
          <Text style={styles.buttonText}>Send email</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

}

export default ChangeEmail

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
  

});
