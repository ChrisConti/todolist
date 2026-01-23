import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import React, { useContext, useEffect, useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from './config';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import { validateBabyName, validateBirthdate, formatBirthdateInput, validateWeight, validateHeight } from './utils/validation';
import { BABY_TYPES, COLLECTIONS } from './utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';


const Baby = ({ navigation }) => {
    const [name, setName] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [birthdate, setBirthdate] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
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

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('error.title'),
                    t('error.galleryPermission'),
                    [
                        { text: t('settings.cancel'), style: 'cancel' },
                        { text: t('baby.openSettings'), onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setProfilePhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const uploadPhoto = async (babyId: string): Promise<string | null> => {
        if (!profilePhoto) return null;

        try {
            const response = await fetch(profilePhoto);
            const blob = await response.blob();
            const storageRef = ref(storage, `babies/${babyId}/profile.jpg`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading photo:', error);
            return null;
        }
    };

    const handleCreateBaby = async () => {
        if (loading) return; // Prévenir double-soumission
        
        // Trim le nom avant validation
        const trimmedName = name.trim();
        const nameValidation = validateBabyName(trimmedName, t);
        if (!nameValidation.isValid) {
            setError(nameValidation.error || t('error.name'));
            return;
        }
        
        const birthdateValidation = validateBirthdate(birthdate, t);
        if (!birthdateValidation.isValid) {
            setError(birthdateValidation.error || t('error.birthdate'));
            return;
        }

        // Valider les champs optionnels si renseignés
        const weightNum = weight ? parseFloat(weight) : undefined;
        const heightNum = height ? parseFloat(height) : undefined;
        
        if (weight) {
            const weightValidation = validateWeight(weightNum, t);
            if (!weightValidation.isValid) {
                setError(weightValidation.error || t('error.invalidWeight'));
                return;
            }
        }
        
        if (height) {
            const heightValidation = validateHeight(heightNum, t);
            if (!heightValidation.isValid) {
                setError(heightValidation.error || t('error.invalidHeight'));
                return;
            }
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
            
            // Upload photo si présente
            let photoURL = null;
            if (profilePhoto) {
                photoURL = await uploadPhoto(uniqueId as string);
            }
            
            const babyData: any = {
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
            };
            
            // Ajouter les champs optionnels seulement s'ils sont renseignés
            if (photoURL) babyData.profilePhoto = photoURL;
            if (weightNum) babyData.weight = weightNum;
            if (heightNum) babyData.height = heightNum;
            
            const docRef = await addDoc(collection(db, COLLECTIONS.BABY), babyData);
            setBabyID(uniqueId);

            // Clean review counters when creating a new baby
            // But keep has_reviewed_app if user already reviewed
            try {
                const hasReviewed = await AsyncStorage.getItem(`has_reviewed_app_${user.uid}`);
                await AsyncStorage.removeItem(`task_created_count_${user.uid}`);
                await AsyncStorage.removeItem(`last_review_prompt_at_count_${user.uid}`);
                await AsyncStorage.removeItem(`review_prompt_count_${user.uid}`);
                // Only remove has_reviewed if user hasn't reviewed yet
                if (hasReviewed !== 'true') {
                    await AsyncStorage.removeItem(`has_reviewed_app_${user.uid}`);
                }
                console.log('✅ Review counters cleaned when creating baby:', uniqueId, 'preserved has_reviewed:', hasReviewed === 'true');
            } catch (storageError) {
                console.warn('⚠️ Failed to clean review counters:', storageError);
            }

            analytics.logEvent('baby_created', {
                babyType: images[selectedImage].type,
                babyId: uniqueId,
                userId: user.uid,
                hasPhoto: !!photoURL,
                hasWeight: !!weightNum,
                hasHeight: !!heightNum
            });
            console.log('📊 baby_created event sent', {
                babyType: images[selectedImage].type,
                babyId: uniqueId,
                userId: user.uid
            });

            setLoading(false);
            navigation.navigate('MainTabs');
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
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: '#FDF1E7' }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView 
                style={{ flex: 1, padding: 10 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 100 }}
            >
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
                            placeholder={t('placeholder.name')}
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
                            placeholder={t('placeholder.birthdate')}
                            maxLength={10} // Maximum length for DD/MM/YYYY
                        />
                    </View>

                    {/* Section optionnelle */}
                    <TouchableOpacity 
                        style={styles.optionalSection}
                        onPress={() => setShowOptionalFields(!showOptionalFields)}
                    >
                        <Text style={styles.optionalTitle}>{t('baby.optionalInfo')}</Text>
                        <FontAwesome 
                            name={showOptionalFields ? 'chevron-up' : 'chevron-down'} 
                            size={16} 
                            color="#C75B4A" 
                        />
                    </TouchableOpacity>
                    
                    {showOptionalFields && (
                        <View style={styles.optionalFields}>
                            <Text style={styles.optionalNote}>{t('baby.infoCanBeAddedLater')}</Text>
                            
                            {/* Photo de profil */}
                            <View style={styles.photoSection}>
                                <Text style={styles.label}>{t('baby.addPhoto')}</Text>
                                {profilePhoto ? (
                                    <View style={styles.photoContainer}>
                                        <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                                        <TouchableOpacity 
                                            style={styles.changePhotoButton}
                                            onPress={pickImage}
                                        >
                                            <Text style={styles.changePhotoText}>{t('baby.changePhoto')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.addPhotoButton}
                                        onPress={pickImage}
                                    >
                                        <FontAwesome name="camera" size={24} color="#C75B4A" />
                                        <Text style={styles.addPhotoText}>{t('baby.selectPhoto')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Poids */}
                            <View>
                                <Text style={styles.label}>{t('baby.weight')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder.weight')}
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            {/* Taille */}
                            <View>
                                <Text style={styles.label}>{t('baby.height')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('placeholder.height')}
                                    value={height}
                                    onChangeText={setHeight}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
            <View style={styles.footer}>
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
                        <Text style={styles.buttonText}>{t('button.validate')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    footer: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: '#FDF1E7',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E8D5C4',
    },
    optionalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginTop: 10,
        backgroundColor: '#FFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8D5C4',
    },
    optionalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C75B4A',
    },
    optionalFields: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#FFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8D5C4',
    },
    optionalNote: {
        fontSize: 13,
        color: '#7A8889',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7A8889',
        marginBottom: 5,
        marginTop: 10,
    },
    photoSection: {
        marginBottom: 15,
    },
    photoContainer: {
        alignItems: 'center',
    },
    photoPreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#C75B4A',
    },
    addPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        backgroundColor: '#FDF1E7',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#C75B4A',
        borderStyle: 'dashed',
    },
    addPhotoText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#C75B4A',
        fontWeight: '600',
    },
    changePhotoButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: '#C75B4A',
        borderRadius: 6,
    },
    changePhotoText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default Baby;