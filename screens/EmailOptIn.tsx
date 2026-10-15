import React, { useMemo, useContext, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, userRef } from '../config';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';

const EmailOptIn = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user, userInfo, setUserInfo } = useContext(AuthentificationUserContext);
  const [emailOptIn, setEmailOptInState] = useState(userInfo?.emailOptIn ?? false);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (value: boolean) => {
    setEmailOptInState(value);
    setSaving(true);
    try {
      const q = query(userRef, where('userId', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'Users', snap.docs[0].id), { emailOptIn: value });
        setUserInfo({ ...userInfo, emailOptIn: value });
      }
    } catch (error) {
      console.error('Error updating emailOptIn:', error);
      setEmailOptInState(!value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email-newsletter" size={48} color={theme.accent} />
        </View>

        <Text style={styles.description}>{t('settings.emailOptInDescription')}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.emailOptIn')}</Text>
          <Switch
            value={emailOptIn}
            onValueChange={handleToggle}
            thumbColor={emailOptIn ? theme.primary : theme.textMuted}
            trackColor={{ false: theme.separator, true: theme.switchOn }}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EmailOptIn;

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  description: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
});
