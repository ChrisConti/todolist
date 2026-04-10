import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { babiesRef } from '../config';
import { getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '../config';
import Boy from '../assets/garcon.svg';
import Girl from '../assets/fille.svg';

interface EditBabyPhotoProps {
  route: any;
  navigation: any;
}

const EditBabyPhoto: React.FC<EditBabyPhotoProps> = ({ route, navigation }) => {
  const { babyID } = useContext(AuthentificationUserContext);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [babyData, setBabyData] = useState<any>(null);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    loadBabyData();
  }, [babyID]);

  const loadBabyData = async () => {
    if (!babyID) return;

    const queryResult = query(babiesRef, where('id', '==', babyID));
    const querySnapshot = await getDocs(queryResult);

    if (!querySnapshot.empty) {
      setBabyData(querySnapshot.docs[0].data());
    }
  };

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
        mediaTypes: ['images'],
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

  const uploadPhoto = async (): Promise<string | null> => {
    if (!newPhotoUri || !babyID) return null;

    try {
      // XHR is required on Android — fetch().blob() is unreliable with
      // content:// and file:// URIs on certain devices/OEM skins.
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.responseType = 'blob';
        xhr.open('GET', newPhotoUri, true);
        xhr.send(null);
      });

      const storageRef = ref(storage, `babies/${babyID}/profile.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error: any) {
      Alert.alert(
        t('error.title'),
        `${t('error.uploadPhoto')}: ${error.code || error.message}`
      );
      return null;
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      t('baby.removePhoto'),
      t('baby.removePhotoConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('baby.remove'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Supprimer de Storage si existe
              if (babyData?.profilePhoto) {
                try {
                  const photoRef = ref(storage, `babies/${babyID}/profile.jpg`);
                  await deleteObject(photoRef);
                } catch (error) {
                  console.log('Photo not found in storage, continuing...');
                }
              }

              // Mettre à jour Firestore
              const queryResult = query(babiesRef, where('id', '==', babyID));
              const querySnapshot = await getDocs(queryResult);

              if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                await updateDoc(doc(db, 'Baby', docId), {
                  profilePhoto: null
                });
              }

              setNewPhotoUri(null);
              setBabyData({ ...babyData, profilePhoto: null });
              Alert.alert(t('success.title'), t('baby.photoRemoved'));
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert(t('error.title'), t('error.general'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!newPhotoUri) {
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const photoURL = await uploadPhoto();

      if (photoURL) {
        const queryResult = query(babiesRef, where('id', '==', babyID));
        const querySnapshot = await getDocs(queryResult);

        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, 'Baby', docId), {
            profilePhoto: photoURL
          });
        }
      }

      Alert.alert(t('success.title'), t('baby.photoUpdated'));
      navigation.goBack();
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert(t('error.title'), t('error.general'));
    } finally {
      setLoading(false);
    }
  };

  const renderPhoto = () => {
    const photoUri = newPhotoUri || babyData?.profilePhoto;

    if (photoUri) {
      return (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
        />
      );
    }

    return babyData?.type === 'Boy' ? (
      <Boy height={150} width={150} />
    ) : (
      <Girl height={150} width={150} />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.photoContainer}>
        {renderPhoto()}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
          <FontAwesome name="image" size={24} color="#FFF" />
          <Text style={styles.actionText}>{t('baby.selectPhoto')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
          <FontAwesome name="camera" size={24} color="#FFF" />
          <Text style={styles.actionText}>{t('baby.takePhoto')}</Text>
        </TouchableOpacity>

        {(newPhotoUri || babyData?.profilePhoto) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={removePhoto}
          >
            <FontAwesome name="trash" size={24} color="#FFF" />
            <Text style={styles.actionText}>{t('baby.removePhoto')}</Text>
          </TouchableOpacity>
        )}
      </View>

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
    padding: 20,
    justifyContent: 'space-between',
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#C75B4A',
  },
  actionsContainer: {
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C75B4A',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
  },
  removeButton: {
    backgroundColor: '#D32F2F',
  },
  actionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#C75B4A',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditBabyPhoto;
