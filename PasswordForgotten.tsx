import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './config';
import { useTranslation } from 'react-i18next';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PasswordForgotten = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [userError, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onHandleForgetPassword() {
    if (loading) return;

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setError(t('enterValidEmail'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSent(true);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Don't reveal whether the email exists — just show success to prevent enumeration
        setSent(true);
      } else {
        setError(t('error.general'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.successText}>{t('settings.resetPasswordEmailSentConfirm')}</Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Connection')}>
            <Text style={styles.buttonText}>{t('button.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      <View style={styles.content}>
        <Text style={styles.description}>
          {t('settings.resetPasswordInstructions')}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          clearButtonMode="while-editing"
          value={email}
          onChangeText={(text) => setEmail(text)}
          onSubmitEditing={onHandleForgetPassword}
          returnKeyType="send"
          editable={!loading}
        />
        {userError !== '' && <Text style={styles.errorText}>{userError}</Text>}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onHandleForgetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#F6F0EB" />
          ) : (
            <Text style={styles.buttonText}>{t('settings.sendEmail')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default PasswordForgotten;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF1E7',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  errorText: {
    color: '#C75B4A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 30, android: 20 }),
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#F6F0EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
