import { StyleSheet } from 'react-native';

module.exports = StyleSheet.create({

    button: {
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
      buttonText: {
        color: '#fff', // White text color
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
      },
});