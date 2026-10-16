import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';

/**
 * Fond clair pour une illustration SVG, en mode sombre uniquement.
 *
 * Les dessins de l'app sont tracés pour un fond clair : leurs contours, les
 * cheveux et les yeux sont en #230D03, un brun quasi noir. Posés sur le fond
 * sombre (#17120F) ils tombent à 1,0:1 — exactement la même luminance, donc
 * des visages sans traits. Sur les cartes de choix du sexe, on ne distingue
 * plus le garçon de la fille.
 *
 * En mode clair ce composant est entièrement transparent : il n'ajoute rien,
 * ne décale rien, et l'apparence existante est préservée au pixel.
 */
interface Props {
  children: React.ReactNode;
  /** Rayon des coins. Un disque pour un avatar, un carré doux pour une vignette. */
  radius?: number;
  /** Marge entre le fond et le dessin. */
  padding?: number;
  style?: ViewStyle;
}

const IllustrationGround: React.FC<Props> = ({ children, radius = 16, padding = 6, style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.ground, { borderRadius: radius, padding }, style]}>
      {children}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  ground: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark ? theme.illustrationGround : 'transparent',
  },
});

export default IllustrationGround;
