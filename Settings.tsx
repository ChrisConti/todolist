import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Linking, Button } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scrollview';
import React, { useContext, useEffect, useState } from 'react';
import ItemParameter from './ItemParameter.js';
import { auth, userRef } from './config.js';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import { deleteUser, signOut } from 'firebase/auth';
import { getDocs, query, where } from 'firebase/firestore';
import WebView from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import analytics from './services/analytics';
import Lolipop from './assets/lolipop.svg';

const Settings = ({ navigation }) => {
  const { user, setUser, babyID, setBabyID, setUserInfo } = useContext(AuthentificationUserContext);
  const [babyExist, setBabyExist] = useState(babyID ? true : false);
  const [modalVisible, setModalVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    analytics.logScreenView('Settings');
  }, []);

  const handleSignOut = () => {
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

  const handleContactUs = () => {
    const email = "tribubabytracker@gmail.com";
    const subject = 'Contact Tribu baby';
    const body = 'Hi there, I would like to...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open email:', err));
  };

  const handleOpenWebsite = () => {
    const url = 'https://www.tribubaby.app';
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleOpenWebsite2 = () => {
    const url = 'https://www.tribubaby.app';
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  useEffect(() => {
    //GetUserInfo(queryResult);

  }, [babyExist]);


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View>
          <View>
            <Text style={styles.titleParameter}>{t('settings.babyOptions')}</Text>
          </View>
          <View>
            {babyExist ? (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('BabyState')}>
                  <ItemParameter title={t('settings.myBaby')} icon="child" />
                </TouchableOpacity>
                
              </>
            ) : (
              <View>
                <TouchableOpacity onPress={() => navigation.navigate('Baby')}>
                  <ItemParameter title={t('title.addBaby')} icon="plus" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('JoinBaby')}>
                  <ItemParameter title={t('settings.joinBaby')} icon="share" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View>
          <View>
            <Text style={styles.titleParameter}>{t('settings.personalOptions')}</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => navigation.navigate('ChangeName')}>
              <ItemParameter title={t('settings.myName')} icon="user" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ChangeEmail')}>
              <ItemParameter title={t('settings.myEmail')} icon="envelope" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')}>
              <ItemParameter title={t('settings.myPassword')} icon="lock" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('DeleteAccount');
              }}
            >
              <ItemParameter title={t('settings.deleteAccount')} icon="user" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <ItemParameter title={t('settings.signOut')} icon="arrow-right" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ExportTasks')}>
                  <ItemParameter title="📊 Exporter les tâches" icon="download" />
                </TouchableOpacity>
          </View>
        </View>

        <View>
          <View>
            <Text style={styles.titleParameter}>{t('settings.about')}</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <ItemParameter title={t('settings.privacyPolicy')} icon="arrow-circle-right" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')}>
              <ItemParameter title={t('settings.termsOfUse')} icon="arrow-circle-right" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleContactUs}>
              <ItemParameter title={t('settings.contactUs')} icon="phone" />
            </TouchableOpacity>
            
          </View>
         
        </View>
      </ScrollView>
      {/* Footer */}
            <View style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              backgroundColor: 'transparent', // Set to 'transparent' to cover the entire bottom
              alignItems: 'center',
              justifyContent: 'flex-end', // Pushes the button to the bottom
              flexDirection: 'column',
              paddingBottom:10
            }}>
                         
            </View>
    </View>
  );
}
/*
<TouchableOpacity onPress={() => navigation.navigate('AnalyticsTest')}>
              <ItemParameter title="🔬 Test Analytics" icon="flask" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ExportTasks')}>
                  <ItemParameter title="📊 Exporter les tâches" icon="download" />
                </TouchableOpacity>
*/

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  titleParameter: {
    color: '#7A8889',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 3,
  },
  contentContainer: {

  },
  webview: { flex: 1 },
  webViewcontainer: {
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'red',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#C75B4A',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});



