import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateAge } from './utils/validation';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import { FontAwesome } from '@expo/vector-icons';

interface BabyProfileTabProps {
  babyData: {
    name: string;
    type: 'Boy' | 'Girl';
    birthDate: string;
    profilePhoto?: string;
    weight?: number;
    height?: number;
  };
  onEdit: () => void;
}

const BabyProfileTab: React.FC<BabyProfileTabProps> = ({ babyData, onEdit }) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = React.useState(false);

  const renderProfilePhoto = () => {
    if (babyData.profilePhoto && !imageError) {
      console.log('🖼️ Rendering photo from URL:', babyData.profilePhoto);
      return (
        <Image 
          source={{ uri: babyData.profilePhoto }} 
          style={styles.profilePhoto}
          onError={(error) => {
            console.error('❌ Image loading error:', error.nativeEvent.error);
            setImageError(true);
          }}
          onLoad={() => console.log('✅ Image loaded successfully')}
        />
      );
    }
    
    // Fallback aux SVG si pas de photo ou si erreur de chargement
    return babyData.type === 'Boy' ? (
      <View style={styles.svgContainer}>
        <Boy height={120} width={120} />
      </View>
    ) : (
      <View style={styles.svgContainer}>
        <Girl height={120} width={120} />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header avec bouton éditer */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <FontAwesome name="edit" size={20} color="#C75B4A" />
          <Text style={styles.editButtonText}>{t('baby.edit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Photo de profil */}
      <View style={styles.photoSection}>
        {renderProfilePhoto()}
      </View>

      {/* Nom du bébé */}
      <Text style={styles.babyName}>{babyData.name}</Text>

      {/* Cartes d'informations */}
      <View style={styles.infoCardsContainer}>
        {/* Carte Âge */}
        <View style={styles.infoCard}>
          <FontAwesome name="calendar" size={24} color="#C75B4A" style={styles.cardIcon} />
          <Text style={styles.cardLabel}>{t('baby.age')}</Text>
          <Text style={styles.cardValue}>{calculateAge(babyData.birthDate, t)}</Text>
        </View>

        {/* Carte Sexe */}
        <View style={styles.infoCard}>
          <FontAwesome 
            name={babyData.type === 'Boy' ? 'mars' : 'venus'} 
            size={24} 
            color="#C75B4A" 
            style={styles.cardIcon} 
          />
          <Text style={styles.cardLabel}>{t('baby.sex')}</Text>
          <Text style={styles.cardValue}>
            {babyData.type === 'Boy' ? t('baby.boy') : t('baby.girl')}
          </Text>
        </View>

        {/* Carte Poids (si renseigné) */}
        {babyData.weight && (
          <View style={styles.infoCard}>
            <FontAwesome name="balance-scale" size={24} color="#C75B4A" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>{t('baby.weight')}</Text>
            <Text style={styles.cardValue}>{babyData.weight} {t('baby.kg')}</Text>
          </View>
        )}

        {/* Carte Taille (si renseignée) */}
        {babyData.height && (
          <View style={styles.infoCard}>
            <FontAwesome name="arrows-v" size={24} color="#C75B4A" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>{t('baby.height')}</Text>
            <Text style={styles.cardValue}>{babyData.height} {t('baby.cm')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C75B4A',
  },
  editButtonText: {
    marginLeft: 8,
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: '600',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#C75B4A',
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
  },
  babyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 14,
    color: '#7A8889',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default BabyProfileTab;
