import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons'; // Import FontAwesome icons
import { useTheme } from './Context/ThemeContext';

const ItemParameter = ({ title, icon, backgroundColor, iconColor, textColor, iconFamily }) => {
    const IconComponent = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome;
    // Settings ne passe aucune couleur : ces valeurs par défaut s'appliquent à
    // toutes les lignes de l'écran, elles doivent donc suivre le thème.
    const { theme } = useTheme();

    return (
    <View style={{
        flexDirection:"row",
        justifyContent:'space-between',
        alignItems:'center',
            backgroundColor: backgroundColor || theme.card,
            borderRadius: 4,
            paddingHorizontal: 20,
            //elevation: 3, // Android shadow
            height: 55,
            //paddingLeft:-300,

            marginBottom:2
    }}>
      <View style={{width:'20%',  alignItems:'center', }}>
        <IconComponent name={icon} size={20} style={{color: iconColor || theme.accent}}/>
      </View>
      <View style={{width:'80%'}}>
        <Text style={{ color: textColor || theme.text }}>
            {title}
        </Text>
      </View>
      <View >
        <FontAwesome name={'chevron-right'} size={15} style={{color: iconColor || theme.accent}} />
         
      </View>
      
    </View>
  )
}

export default ItemParameter