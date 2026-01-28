import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons'; // Import FontAwesome icons

const ItemParameter = ({ title, icon, backgroundColor, iconColor, textColor, iconFamily }) => {
    const IconComponent = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome;

    return (
    <View style={{
        flexDirection:"row",
        justifyContent:'space-between',
        alignItems:'center',
            backgroundColor: backgroundColor || '#FDF1E7',
            borderRadius: 4,
            paddingHorizontal: 20,
            //elevation: 3, // Android shadow
            height: 55,
            //paddingLeft:-300,

            marginBottom:2
    }}>
      <View style={{width:'20%',  alignItems:'center', }}>
        <IconComponent name={icon} size={20} style={{color: iconColor || '#C75B4A'}}/>
      </View>
      <View style={{width:'80%'}}>
        <Text style={{ color: textColor || 'black'}}>
            {title}
        </Text>
      </View>
      <View >
        <FontAwesome name={'chevron-right'} size={15} style={{color: iconColor || '#C75B4A'}} />
         
      </View>
      
    </View>
  )
}

export default ItemParameter