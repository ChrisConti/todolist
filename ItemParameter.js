import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { FontAwesome } from '@expo/vector-icons'; // Import FontAwesome icons

const ItemParameter = ({ title, icon }) => {
    return (
    <View style={{
        flexDirection:"row",
        alignItems:'center',
            backgroundColor: 'white', // Blue color
            borderRadius: 4,
            paddingHorizontal: 20,
            elevation: 3, // Android shadow
            height: 60
    }}>
      <View style={{width:'20%'}}>
        <FontAwesome name={icon} size={20} style={{color: '#46B0FC'}}/>
      </View>
      <View style={{width:'80%'}}>
        <Text style={{ color: 'black'}}>
            {title}
        </Text>
      </View>
      <View >
        <FontAwesome name={'chevron-right'} size={15} style={{color: '#46B0FC'}} />
         
      </View>
      
    </View>
  )
}

export default ItemParameter