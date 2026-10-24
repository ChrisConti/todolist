import React, { useContext, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../config.js';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import analytics from '../services/analytics';
import { initialOf } from '../utils/initials';
import { signOutGoogle } from '../utils/socialAuth';

// Ouvert depuis la carte profil des Paramètres : tout ce qui touche au compte.
const MyProfile = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { setUser, setBabyID, setUserInfo, userInfo } = useContext(AuthentificationUserContext);
  const provider = userInfo?.provider || 'email';

  useEffect(() => {
    analytics.logScreenView('MyProfile');
  }, []);

  const handleSignOut = () => {
    analytics.logEvent('sign_out', { provider });
    // Sans condition : un compte e-mail peut aussi s'être connecté via Google.
    signOutGoogle();
    signOut(auth)
      .then(() => {
        setUser(null);
        setBabyID(null);
        setUserInfo(null);
      })
      .catch((error) => {
        Alert.alert(error.message);
      });
  };

  const rows = [
    { key: 'change_name', label: t('settings.myName'), value: userInfo?.username, route: 'ChangeName' },
    { key: 'change_email', label: t('settings.myEmail'), value: userInfo?.email, route: 'ChangeEmail' },
    // Pas de mot de passe pour un compte Google ou Apple, comme avant.
    ...(provider === 'email'
      ? [{ key: 'change_password', label: t('settings.myPassword'), value: '••••••••', route: 'ChangePassword' }]
      : []),
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialOf(userInfo?.username, userInfo?.email)}</Text>
      </View>

      <View style={styles.card}>
        {rows.map((row, i) => (
          <TouchableOpacity
            key={row.key}
            style={[styles.field, i > 0 && styles.fieldBorder]}
            onPress={() => {
              analytics.logEvent('settings_item_tapped', { item: row.key });
              navigation.navigate(row.route);
            }}
          >
            <Text style={styles.fieldLabel}>{row.label}</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>{row.value}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity style={[styles.card, styles.signOut]} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.delete}
        onPress={() => {
          analytics.logEvent('settings_item_tapped', { item: 'delete_account' });
          navigation.navigate('DeleteAccount');
        }}
      >
        <Text style={styles.deleteText}>{t('settings.deleteAccount')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default MyProfile;

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { flexGrow: 1, padding: 16, paddingTop: 28, gap: 20, paddingBottom: 32 },
  avatar: {
    alignSelf: 'center',
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: theme.tintTerracotta,
    borderWidth: 2, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 38, fontWeight: '700', color: theme.onTintTerracotta },
  card: {
    backgroundColor: theme.card,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.dark ? 0 : 0.06,
    shadowRadius: 12,
    elevation: theme.dark ? 0 : 2,
  },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 20 },
  fieldBorder: { borderTopWidth: 1, borderTopColor: theme.separator },
  // Largeur fixe comme sur la maquette, assez large pour « Mi correo electrónico ».
  fieldLabel: { width: 150, fontSize: 14, color: theme.textSecondary },
  fieldValue: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  spacer: { flex: 1 },
  signOut: { minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: 16, fontWeight: '700', color: theme.accent },
  delete: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 15, color: theme.danger },
});
