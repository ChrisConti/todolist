import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert } from 'react-native';
import React, { useContext, useEffect, useState, useRef } from 'react';

import { auth, db } from './config';
import { addDoc, collection } from 'firebase/firestore';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import { validateBabyName, validateBirthdate, formatBirthdateInput } from './utils/validation';
import { BABY_TYPES, COLLECTIONS } from './utils/constants';


const Baby = ({ navigation }) => {
    const [name, setName] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [birthdate, setBirthdate] = useState('');
    const [userError, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const nameInputRef = useRef<TextInput>(null);

    const { user, setBabyID, userInfo } = useContext(AuthentificationUserContext);
    const { t } = useTranslation();

    const images = [
        { id: 0, type: 'Boy', rq: require('./assets/boy.png') },
        { id: 1, type: 'Girl', rq: require('./assets/girl.png') },
    ];

    useEffect(() => {
        if (!user) return;

        analytics.logScreenView('Baby');
        
        // Auto-focus sur le champ nom
        setTimeout(() => nameInputRef.current?.focus(), 100);
    }, []);

    const handleCreateBaby = async () => {
        if (loading) return; // Prévenir double-soumission
        
        // Trim le nom avant validation
        const trimmedName = name.trim();
        const nameValidation = validateBabyName(trimmedName);
        if (!nameValidation.isValid) {
            setError(nameValidation.error || t('error.name'));
            return;
        }
        
        const birthdateValidation = validateBirthdate(birthdate);
        if (!birthdateValidation.isValid) {
            setError(birthdateValidation.error || t('error.birthdate'));
            return;
        }

        if (!user || !user.uid) {
            console.error('Cannot create baby: user not authenticated');
            setError(t('error.notAuthenticated'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const uniqueId = uuid.v4();
            const docRef = await addDoc(collection(db, COLLECTIONS.BABY), {
                id: uniqueId,
                type: images[selectedImage].type,
                name: trimmedName,
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
            console.log('📊 baby_created event sent', {
                babyType: images[selectedImage].type,
                babyId: uniqueId,
                userId: user.uid
            });

            setLoading(false);
            navigation.navigate('BabyList');
        } catch (error: any) {
            console.error("Error adding document: ", error);
            setLoading(false);
            
            if (error.code === 'permission-denied') {
                setError(t('error.permissionDenied') || 'Permission denied');
            } else if (error.code === 'unavailable') {
                setError(t('error.networkError') || 'Network error. Check your connection.');
            } else {
                setError(t('error.babyCreationFailed') || 'Unable to create baby. Please try again.');
            }

            analytics.logEvent('baby_creation_failed', {
                babyType: images[selectedImage].type,
                userId: user.uid,
                errorCode: error.code || 'unknown',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const handleChange = (text: string) => {
        const formatted = formatBirthdateInput(text);
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
                                ref={nameInputRef}
                                style={styles.input}
                                placeholder={t('placeholders.name')}
                                autoCapitalize="words"
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
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleCreateBaby}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#F6F0EB" />
                        ) : (
                            <Text style={styles.buttonText}>{t('buttons.validate')}</Text>
                        )}
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
    buttonDisabled: {
        backgroundColor: '#D8ABA0',
        opacity: 0.7,
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