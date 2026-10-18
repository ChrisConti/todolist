import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateAge } from './utils/validation';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';
import { useTheme } from './Context/ThemeContext';
import type { Theme } from './constants/theme';

interface BabyProfileCardProps {
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

// Carte d'identité en tête de l'écran Bébé : photo, prénom, Modifier, puis
// Âge / Sexe / Poids / Taille. Poids et taille non renseignés : un tiret.
const BabyProfileCard: React.FC<BabyProfileCardProps> = ({ babyData, onEdit }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [imageError, setImageError] = React.useState(false);

  // La carte reste montée : une nouvelle photo doit pouvoir remplacer un échec précédent.
  useEffect(() => {
    setImageError(false);
  }, [babyData.profilePhoto]);

  const facts = [
    { key: 'age', label: t('baby.age'), value: calculateAge(babyData.birthDate, t) },
    { key: 'sex', label: t('baby.sex'), value: babyData.type === 'Boy' ? t('baby.boy') : t('baby.girl') },
    { key: 'weight', label: t('baby.weight'), value: babyData.weight ? `${babyData.weight} ${t('baby.kg')}` : '–' },
    { key: 'height', label: t('baby.height'), value: babyData.height ? `${babyData.height} ${t('baby.cm')}` : '–' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        {babyData.profilePhoto && !imageError ? (
          <Image
            source={{ uri: babyData.profilePhoto }}
            style={styles.photo}
            onError={() => setImageError(true)}
          />
        ) : (
          // Les dessins ont des traits sombres : fond clair même en mode sombre.
          <View style={styles.svgContainer}>
            {babyData.type === 'Boy' ? <Boy height={56} width={56} /> : <Girl height={56} width={56} />}
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{babyData.name}</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit} accessibilityRole="button" hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Text style={styles.editText}>{t('baby.edit')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.facts}>
        {facts.map((fact, i) => (
          <View key={fact.key} style={[styles.fact, i > 0 && styles.factBorder]}>
            <Text style={styles.factLabel} numberOfLines={1}>{fact.label}</Text>
            <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit>{fact.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0 : 0.06,
    shadowRadius: 12,
    elevation: theme.dark ? 0 : 2,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  photo: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: theme.tintTerracotta,
  },
  svgContainer: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: theme.tintTerracotta,
    backgroundColor: theme.illustrationGround,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { flex: 1, fontFamily: 'Pacifico', fontSize: 26, color: theme.accent },
  editButton: {
    backgroundColor: theme.tintTerracotta,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  editText: { fontSize: 14, fontWeight: '700', color: theme.onTintTerracotta },
  facts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.separator },
  fact: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 2 },
  factBorder: { borderLeftWidth: 1, borderLeftColor: theme.separator },
  factLabel: { fontSize: 12, color: theme.textSecondary },
  factValue: { fontSize: 16, fontWeight: '800', color: theme.text },
});

export default BabyProfileCard;
