import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ToastAndroid,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { babiesRef, storage } from './config';
import { getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  validateBabyName,
  validateBirthdate,
  formatBirthdateInput,
  validateWeight,
  validateHeight,
} from './utils/validation';
import analytics from './services/analytics';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';

const EditBaby = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { user, babyID: contextBabyID } = useContext(AuthentificationUserContext);
  const { babyData: initialBabyData } = route.params;

  // Utiliser l'ID du bébé passé en params, avec fallback sur le contexte
  const babyID = initialBabyData?.id || contextBabyID;

  const [name, setName] = useState(initialBabyData?.name || '');
  const [birthdate, setBirthdate] = useState(initialBabyData?.birthDate || '');
  const [selectedType, setSelectedType] = useState(
    initialBabyData?.type === 'Boy' ? 0 : 1
  );
  const [weight, setWeight] = useState(
    initialBabyData?.weight ? initialBabyData.weight.toString() : ''
  );
  const [height, setHeight] = useState(
    initialBabyData?.height ? initialBabyData.height.toString() : ''
  );
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    initialBabyData?.profilePhoto || null
  );
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const types = [
    { id: 0, type: 'Boy' },
    { id: 1, type: 'Girl' },
  ];

  // Helper pour extraire le chemin du fichier depuis l'URL Firebase Storage
  const extractStoragePathFromUrl = (url: string): string | null => {
    try {
      console.log('🔍 Extracting path from URL:', url);
      const match = url.match(/\/o\/(.+?)\?/);
      console.log('🔍 Regex match result:', match);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        console.log('🔍 Decoded path:', decoded);
        return decoded;
      }
      return null;
    } catch (error) {
      console.error('❌ Error extracting storage path:', error);
      return null;
    }
  };


  useEffect(() => {
    if (error && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [error]);

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
        setNewPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('error.title'),
          t('error.cameraPermission'),
          [
            { text: t('settings.cancel'), style: 'cancel' },
            { text: t('baby.openSettings'), onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const removePhoto = async () => {
    // Supprimer directement sans confirmation
    if (profilePhoto) {
      try {
        const storagePath = extractStoragePathFromUrl(profilePhoto);
        console.log('🗑️ Deleting photo at path:', storagePath);
        if (storagePath) {
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
          console.log('✅ Photo deleted from storage');
        }
      } catch (deleteError) {
        console.log('⚠️ Error deleting photo from storage:', deleteError);
      }
    }
    setProfilePhoto(null);
    setNewPhotoUri(null);
    
    // Toast notification
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('success.photoRemoved'), ToastAndroid.SHORT);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!newPhotoUri) return profilePhoto;

    try {
      console.log('🔄 Starting photo upload...');
      console.log('📁 Baby ID:', babyID);
      console.log('📸 Photo URI:', newPhotoUri);

      // Supprimer l'ancienne photo si elle existe
      if (profilePhoto) {
        try {
          const storagePath = extractStoragePathFromUrl(profilePhoto);
          console.log('🗑️ Deleting old photo at path:', storagePath);
          if (storagePath) {
            const oldStorageRef = ref(storage, storagePath);
            await deleteObject(oldStorageRef);
            console.log('✅ Old photo deleted from storage');
          }
        } catch (deleteError) {
          console.log('⚠️ No old photo to delete or error:', deleteError);
        }
      }

      // Lire l'image en base64
      console.log('📤 Reading image as base64...');
      const base64 = await FileSystem.readAsStringAsync(newPhotoUri, {
        encoding: 'base64',
      });
      console.log('✅ Image converted to base64');

      const timestamp = Date.now();
      const fileName = `babies/${babyID}/profile_${timestamp}.jpg`;
      
      // Upload avec fetch directement (pas de SDK Firebase)
      console.log('⬆️ Uploading via fetch...');
      const idToken = await user.getIdToken();
      
      // Convertir base64 en Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o?name=${encodeURIComponent(fileName)}`;
      console.log('📡 Upload URL:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'image/jpeg',
        },
        body: bytes,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload complete, result:', result);
      
      // Récupérer le token depuis la réponse
      const downloadToken = result.downloadTokens;
      console.log('🔑 Download token:', downloadToken);
      
      // Construire l'URL avec le token
      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;
      console.log('✅ Download URL with token:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      throw new Error(t('error.photoUploadFailed'));
    }
  };

  const handleSave = async () => {
    if (loading) return;

    // Validation
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

    setLoading(true);
    setError('');

    try {
      // Upload photo si nouvelle photo
      let photoURL = profilePhoto;
      if (newPhotoUri) {
        photoURL = await uploadPhoto();
        // Mettre à jour l'état local avec la nouvelle URL
        setProfilePhoto(photoURL);
        setNewPhotoUri(null);
      } else if (!profilePhoto && !newPhotoUri) {
        // Si photo supprimée, supprimer du storage
        try {
          const storageRef = ref(storage, `babies/${babyID}/profile.jpg`);
          await deleteObject(storageRef);
        } catch (deleteError) {
          console.log('No photo to delete or error deleting:', deleteError);
        }
        photoURL = null;
      }

      // Préparer les données à mettre à jour
      const updateData: any = {
        name: trimmedName,
        birthDate: birthdate,
        type: types[selectedType].type,
      };

      // Ajouter ou supprimer les champs optionnels
      if (photoURL) {
        updateData.profilePhoto = photoURL;
      } else {
        updateData.profilePhoto = null;
      }

      if (weightNum !== undefined) {
        updateData.weight = weightNum;
      } else {
        updateData.weight = null;
      }

      if (heightNum !== undefined) {
        updateData.height = heightNum;
      } else {
        updateData.height = null;
      }

      // Mettre à jour dans Firestore
      const queryResult = query(babiesRef, where('id', '==', babyID));
      const querySnapshot = await getDocs(queryResult);

      if (querySnapshot.empty) {
        console.error('❌ Baby not found with ID:', babyID);
        setError(t('error.babyNotFound') || 'Baby not found');
        setLoading(false);
        return;
      }

      const babyDoc = querySnapshot.docs[0];
      await updateDoc(babyDoc.ref, updateData);

      // Toast notification
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('success.babyUpdated'), ToastAndroid.SHORT);
      } else {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1000);
      }

      setTimeout(() => navigation.goBack(), Platform.OS === 'ios' ? 1000 : 0);
    } catch (error: any) {
      console.error('Error updating baby:', error);
      setError(error.message || t('error.general'));
    } finally {
      setLoading(false);
    }
  };

  const handleBirthdateChange = (text: string) => {
    const formatted = formatBirthdateInput(text);
    setBirthdate(formatted);
  };

  const renderProfilePhoto = () => {
    const photoUri = newPhotoUri || profilePhoto;
    console.log('📷 EditBaby renderProfilePhoto - newPhotoUri:', newPhotoUri);
    console.log('📷 EditBaby renderProfilePhoto - profilePhoto:', profilePhoto);
    console.log('📷 EditBaby renderProfilePhoto - photoUri:', photoUri);
    
    if (photoUri) {
      return (
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.profilePhoto}
            onError={(error) => {
              console.error('❌ EditBaby Image loading error:', error.nativeEvent.error);
            }}
            onLoad={() => console.log('✅ EditBaby Image loaded successfully')}
          />
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoActionButton} onPress={pickImage}>
              <FontAwesome name="image" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
              <FontAwesome name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoActionButton, styles.removeButton]}
              onPress={removePhoto}
            >
              <FontAwesome name="trash" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Fallback aux SVG
    return (
      <View style={styles.photoContainer}>
        <View style={styles.svgContainer}>
          {selectedType === 0 ? (
            <Boy height={120} width={120} />
          ) : (
            <Girl height={120} width={120} />
          )}
        </View>
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoActionButton} onPress={pickImage}>
            <FontAwesome name="image" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
            <FontAwesome name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo de profil */}
        {renderProfilePhoto()}

        {/* Message d'erreur */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Sélection du sexe */}
        <Text style={styles.label}>{t('baby.sex')}</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            onPress={() => setSelectedType(0)}
            style={[styles.typeOption, selectedType === 0 && styles.typeOptionSelected]}
          >
            <Boy height={60} width={60} />
            <Text style={styles.typeText}>{t('baby.boy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedType(1)}
            style={[styles.typeOption, selectedType === 1 && styles.typeOptionSelected]}
          >
            <Girl height={60} width={60} />
            <Text style={styles.typeText}>{t('baby.girl')}</Text>
          </TouchableOpacity>
        </View>

        {/* Nom */}
        <Text style={styles.label}>
          {t('baby.name')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.name')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={50}
        />

        {/* Date de naissance */}
        <Text style={styles.label}>
          {t('baby.birthdate')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.birthdate')}
          value={birthdate}
          onChangeText={handleBirthdateChange}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Poids (optionnel) */}
        <Text style={styles.label}>{t('baby.weight')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.weight')}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          maxLength={4}
        />

        {/* Taille (optionnelle) */}
        <Text style={styles.label}>{t('baby.height')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.height')}
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          maxLength={2}
        />
      </ScrollView>

      {/* Footer avec boutons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('button.validate')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast personnalisé pour iOS */}
      {showToast && (
        <View style={styles.customToast}>
          <View style={styles.customToastContent}>
            <Text style={styles.customToastText}>{t('success.babyUpdated')}</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#C75B4A',
    marginBottom: 15,
  },
  svgContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#C75B4A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginBottom: 15,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C75B4A',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: 50,
    height: 50,
  },
  removeButton: {
    backgroundColor: '#D32F2F',
  },
  photoActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  required: {
    color: '#D32F2F',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  typeOption: {
    width: '45%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  typeOptionSelected: {
    borderColor: '#C75B4A',
  },
  typeText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    fontSize: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FDF1E7',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    width: 250,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  customToast: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  customToastContent: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customToastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditBaby;
