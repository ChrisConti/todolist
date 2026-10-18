import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { AppState, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import * as Application from 'expo-application';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../config';
import { useTheme } from '../Context/ThemeContext';
import type { Theme } from '../constants/theme';
import Analytics from '../services/analytics';
import { log } from '../utils/logger';
import { customMessageFor, isUpdateRequired, minVersionFor, parseVersion } from '../utils/appVersion';

const APP_STORE_URL = 'https://apps.apple.com/app/id6740452792';
const PLAY_STORE_URL = 'market://details?id=com.tribubaby.tribubaby';
const PLAY_STORE_WEB_URL = 'https://play.google.com/store/apps/details?id=com.tribubaby.tribubaby';

// Version du binaire installé (versionName Android / CFBundleShortVersionString iOS), celle
// que voit le store. Pas Constants.expoConfig.version : c'est la version d'app.json, que la
// procédure de release ne met pas à jour (Android buildé en 1.3.4 avec app.json en 1.3.6).
const CURRENT_VERSION = Application.nativeApplicationVersion;

// Vérifie au lancement et à chaque retour au premier plan, sans retarder le démarrage :
// l'app s'affiche pendant la lecture, l'écran bloquant prend la place si besoin.
// Lecture impossible (hors ligne, document absent, règles) : on garde la dernière règle
// lue pendant cette session, et au premier lancement on ne bloque personne.
export default function ForceUpdateGate({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const snapshot = await getDocFromServer(doc(db, 'Config', 'app'));
        if (active) setConfig(snapshot.exists() ? snapshot.data() : undefined);
      } catch (error) {
        log.debug('Force update check skipped', 'ForceUpdateGate', error);
      }
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const minVersion = minVersionFor(config, Platform.OS);
  useEffect(() => {
    // Saisi comme nombre (1.4) ou mal tapé dans la console : on ne bloque pas, mais on le
    // signale pour ne pas croire le blocage actif.
    if (minVersion !== undefined && minVersion !== '' && parseVersion(minVersion) === null) {
      log.warn(`Unreadable minimum version in Config/app: ${JSON.stringify(minVersion)}`, 'ForceUpdateGate');
    }
  }, [minVersion]);

  if (isUpdateRequired(CURRENT_VERSION, minVersion)) {
    return <ForceUpdateScreen config={config} minVersion={String(minVersion)} />;
  }
  return <>{children}</>;
}

function ForceUpdateScreen({ config, minVersion }: { config: Record<string, any> | undefined; minVersion: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const customMessage = customMessageFor(config, i18n.language);

  useEffect(() => {
    // Bloqué avant la fin du chargement : le splash ne serait jamais masqué.
    SplashScreen.hideAsync().catch(() => {});
    Analytics.logEvent('force_update_shown', { current_version: CURRENT_VERSION, min_version: minVersion });
  }, [minVersion]);

  const openStore = async () => {
    Analytics.logEvent('force_update_tapped', { current_version: CURRENT_VERSION, min_version: minVersion });
    if (Platform.OS === 'ios') {
      Linking.openURL(APP_STORE_URL).catch(() => {});
      return;
    }
    try {
      await Linking.openURL(PLAY_STORE_URL);
    } catch {
      Linking.openURL(PLAY_STORE_WEB_URL).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.icon} />
      <Text style={styles.title}>{t('forceUpdate.title')}</Text>
      <Text style={styles.message}>{t('forceUpdate.message')}</Text>
      {customMessage && <Text style={styles.customMessage}>{customMessage}</Text>}
      <TouchableOpacity style={styles.button} onPress={openStore} accessibilityRole="button">
        <Text style={styles.buttonText}>{t('forceUpdate.button')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: theme.background,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  customMessage: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 32,
    alignSelf: 'stretch',
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
