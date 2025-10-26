import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';

import { auth, db } from './config';
import { addDoc, collection } from 'firebase/firestore';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';


const Baby = ({ navigation }) => {
    const [name, setName] = useState('');
    const [birth, setBirth] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [birthdate, setBirthdate] = useState('');
    
    const [userError, setError] = useState('');

    const { user, setBabyID, userInfo } = useContext(AuthentificationUserContext);
    const { t } = useTranslation();

    const images = [
        { id: 0, type: 'Boy', rq: require('./assets/boy.png') },
        { id: 1, type: 'Girl', rq: require('./assets/girl.png') },
    ];

    useEffect(() => {
        if (!user) return;

        analytics.logScreenView('Baby');
    }, []);

    const handleCreateBaby = async () => {
        if (name.length < 2) {
            setError(t('errors.name'));
            return;
        }
        if (birthdate.length < 8) {
            setError(t('errors.birthdate'));
            return;
        }

        try {
            const uniqueId = uuid.v4();
            const docRef = await addDoc(collection(db, "Baby"), {
                id: uniqueId,
                type: images[selectedImage].type,
                name: name,
                birthDate: birthdate,
                CreatedDate: moment().format('YYYY-MM-DD HH:mm:ss'),
                user: [user.uid],
                admin: user.uid,
                userName: userInfo?.username || 'Unknown',
                userEmail: userInfo?.email || '',
                tasks: [],
            });
            setBabyID(uniqueId);

            analytics.logEvent('baby_created', {
                babyType: images[selectedImage].type,
                babyId: uniqueId,
                userId: user.uid
            });

            navigation.navigate('BabyList');
        } catch (error) {
            console.error("Error adding document: ", error);
            setError(error.message);

            analytics.logEvent('baby_creation_failed', {
                babyType: images[selectedImage].type,
                userId: user.uid,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const handleChange = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
            formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
        }
        setBirthdate(formatted);
    };

    const handleImageSelection = (id) => {
        setSelectedImage(id);

        // Log analytics event for image selection
   
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
                <ScrollView>
                    <View style={{ justifyContent: 'center' }}>
                        <View style={{ flexDirection: "row", justifyContent: 'center' }}>
                            <TouchableOpacity
                                onPress={() => handleImageSelection(0)}
                                style={[selectedImage == 0 ? styles.imageSelected : styles.imageNonSelected]}
                            >
                                <Boy height={90} width={90} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleImageSelection(1)}
                                style={[selectedImage == 1 ? styles.imageSelected : styles.imageNonSelected]}
                            >
                                <Girl height={90} width={90} />
                            </TouchableOpacity>
                        </View>
                        <View>
                            <TextInput
                                style={styles.input}
                                placeholder={t('placeholders.name')}
                                autoCapitalize="none"
                                value={name}
                                onChangeText={(text) => setName(text)}
                            />
                        </View>

                        <View style={styles.container}>
                            <TextInput
                                style={styles.input}
                                value={birthdate}
                                onChangeText={handleChange}
                                keyboardType="numeric"
                                placeholder={t('placeholders.birthdate')}
                                maxLength={10} // Maximum length for DD/MM/YYYY
                            />
                        </View>
                    </View>
                </ScrollView>
                <View style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 0,
                    right: 0,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexDirection: 'column',
                }}>
                    <View>
                        <Text style={styles.errorText}>{userError}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleCreateBaby}
                    >
                        <Text style={styles.buttonText}>{t('buttons.validate')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    imageSelected: {
        width: 120,
        height: 120,
        resizeMode: 'cover',
        borderColor: '#C75B4A',
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: "row",
    },
    imageNonSelected: {
        width: 120,
        height: 120,
        resizeMode: 'cover',
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'transparent',
        flexDirection: "row",
    },
    input: {
        width: '100%',
        height: 50,
        borderBottomWidth: 1,
        borderColor: '#C75B4A',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#C75B4A',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
        width: 250,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Baby;