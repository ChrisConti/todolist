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
import { BABY_TYPES, COLLECTIONS, KEYBOARD_CONFIG } from './utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';


const Baby = ({ navigation }) => {
    const [name, setName] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [birthdate, setBirthdate] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
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
                baby_type: images[selectedImage].type,
                baby_id: uniqueId,
                user_id: user.uid,
                has_photo: !!photoURL,
                has_weight: !!weightNum,
                has_height: !!heightNum
            });
            console.log('📊 baby_created event sent', {
                baby_type: images[selectedImage].type,
                baby_id: uniqueId,
                user_id: user.uid
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
                baby_type: images[selectedImage].type,
                user_id: user.uid,
                error_code: error.code || 'unknown',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    const handleChange = (text: string) => {
        const formatted = formatBirthdateInput(text);
        setBirthdate(formatted);
    };

    const handleWeightChange = (text: string) => {
        // Ne garder que les chiffres et le point décimal
        const cleaned = text.replace(/[^0-9.]/g, '');
        // Empêcher plusieurs points
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            setWeight(parts[0] + '.' + parts.slice(1).join(''));
        } else {
            setWeight(cleaned);
        }
    };

    const handleHeightChange = (text: string) => {
        // Ne garder que les chiffres et le point décimal
        const cleaned = text.replace(/[^0-9.]/g, '');
        // Empêcher plusieurs points
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            setHeight(parts[0] + '.' + parts.slice(1).join(''));
        } else {
            setHeight(cleaned);
        }
    };

    const handleImageSelection = (id) => {
        setSelectedImage(id);

        // Log analytics event for image selection
   
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FDF1E7' }}
            behavior={KEYBOARD_CONFIG.BEHAVIOR}
            keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_CONFIG.IOS_OFFSET : KEYBOARD_CONFIG.ANDROID_OFFSET}
        >
            <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
            >
                {/* Sélection du sexe */}
                <View style={styles.sexSelection}>
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

                {/* Section Informations essentielles */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('baby.essentialInfo')}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('baby.name')}</Text>
                        <TextInput
                            ref={nameInputRef}
                            style={styles.input}
                            placeholder={t('placeholder.name')}
                            autoCapitalize="words"
                            value={name}
                            onChangeText={(text) => setName(text)}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('baby.birthdate')}</Text>
                        <TextInput
                            style={styles.input}
                            value={birthdate}
                            onChangeText={handleChange}
                            keyboardType="numeric"
                            placeholder={t('placeholder.birthdate')}
                            maxLength={10}
                            editable={!loading}
                        />
                    </View>
                </View>

                {/* Section Informations complémentaires */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('baby.additionalInfo')}</Text>
                    <Text style={styles.optionalNote}>{t('baby.infoCanBeAddedLater')}</Text>

                    {/* Photo de profil */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.labelOptional}>
                            {t('baby.addPhoto')} <Text style={styles.optionalTag}>({t('baby.optional')})</Text>
                        </Text>
                        {profilePhoto ? (
                            <View style={styles.photoContainer}>
                                <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                                <TouchableOpacity
                                    style={styles.changePhotoButton}
                                    onPress={pickImage}
                                    disabled={loading}
                                >
                                    <Text style={styles.changePhotoText}>{t('baby.changePhoto')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.addPhotoButton}
                                onPress={pickImage}
                                disabled={loading}
                            >
                                <FontAwesome name="camera" size={24} color="#C75B4A" />
                                <Text style={styles.addPhotoText}>{t('baby.selectPhoto')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Poids */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.labelOptional}>
                            {t('baby.weight')} <Text style={styles.optionalTag}>({t('baby.optional')})</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('placeholder.weight')}
                            value={weight}
                            onChangeText={handleWeightChange}
                            keyboardType="decimal-pad"
                            editable={!loading}
                        />
                    </View>

                    {/* Taille */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.labelOptional}>
                            {t('baby.height')} <Text style={styles.optionalTag}>({t('baby.optional')})</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('placeholder.height')}
                            value={height}
                            onChangeText={handleHeightChange}
                            keyboardType="decimal-pad"
                            editable={!loading}
                        />
                    </View>
                </View>

                {/* Message d'erreur */}
                {userError !== '' && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{userError}</Text>
                    </View>
                )}

                {/* Bouton de validation */}
                <View style={styles.footer}>
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
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sexSelection: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    imageSelected: {
        width: 120,
        height: 120,
        borderColor: '#C75B4A',
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    imageNonSelected: {
        width: 120,
        height: 120,
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'transparent',
        marginHorizontal: 10,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    labelOptional: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7A8889',
        marginBottom: 8,
    },
    optionalTag: {
        fontSize: 13,
        fontWeight: 'normal',
        color: '#7A8889',
        fontStyle: 'italic',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#C75B4A',
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#FFF',
    },
    optionalNote: {
        fontSize: 13,
        color: '#7A8889',
        marginBottom: 15,
        fontStyle: 'italic',
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
    errorContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    errorText: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#C75B4A',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 40,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 300,
        minHeight: 50,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Baby;