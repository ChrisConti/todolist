import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import Chevron from './assets/chevronright.svg';
import moment from 'moment';
import { differenceInMinutes, parseISO } from 'date-fns';

const Card = ({ task, navigation}) => {
  const images = [
    {id: 0, rq: require('./assets/biberon.png')},
    {id: 1, rq: require('./assets/diaper.png')},
    {id: 2, rq: require('./assets/medicaments.png')},
    {id: 3, rq: require('./assets/sommeil.png')},
    {id: 4, rq: require('./assets/thermo.png')},
    {id: 5, rq: require('./assets/allaitement.png')},
  ];

const handleCategory = (id) => {
  //console.log(id)
  if(id == 0) return <Text style={{ color: 'white'}}>Mil</Text>
  if(id == 3) return <Text style={{ color: 'white'}}>Min</Text>
  if(id == 4) return <Text style={{ color: 'white'}}>°C</Text>
  if(id == 4) return <Text style={{ color: 'white'}}>min</Text>
}

const getMinuteDiff = (time) => {
  const currentTimestamp = new Date();
  const timeDifferenceInMillis = currentTimestamp - time;
  //console.log(Math.floor(timeDifferenceInMillis / (1000 * 60)))
  return  Math.floor(timeDifferenceInMillis / (1000 * 60));
}

    return (
    <TouchableOpacity
    
    onPress={() => {
      navigation.navigate('TaskDetail', {task})
    }}
    key={task.uid}
    style={{
        flexDirection:"row",
        alignItems:"center",
        justifyContent:"space-between",
            backgroundColor: '#46B0FC', // Blue color
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
            marginBottom: 2,
            marginLeft: 8,
            marginRight: 8
            //width:90
    }}>
      <View style={{flexDirection:"row"}}>
        <Image style={{
            width: 40,
            height: 40,
            resizeMode: 'cover'
        }} source={images[task.id].rq} />
      </View>
      <View>
        <Text style={{ color: 'white'}}>
            {task.label}
        </Text>
        {handleCategory(images[task.id].id)}
      </View>
      <View>
            <Text style={{color:'white'}}>
              {moment(task.date).format('HH:mm')}
            </Text>
            <View style={{flexDirection:'row'}}>
            
      
            </View>
            
    
      </View>
    </TouchableOpacity>
  )
}

export default Card

/*
<Text style={{color:'white'}}>
              {differenceInMinutes(new Date(), parseISO(task.date))}
            </Text>
            */