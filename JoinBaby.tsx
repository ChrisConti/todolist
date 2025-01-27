import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useState } from 'react';
import { getDocs, query, updateDoc, where } from 'firebase/firestore';
import { babiesRef, db, userRef } from './config';
import { AuthentificationUserContext } from './Context/AuthentificationContext';
import { useTranslation } from 'react-i18next';

const JoinBaby = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { user, userInfo, babyID, setBabyID } = useContext(AuthentificationUserContext);
  const [babyIDPaste, setbabyIDPaste] = useState(userInfo.userbabyIDPaste);
  const [userError, setError] = useState('');
  const [babyValid, setBabyValid] = useState(false);
  const [isRoleExpanded, setIsRoleExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    { label: t('roles.papa'), value: 'papa' },
    { label: t('roles.maman'), value: 'maman' },
    { label: t('roles.nounou'), value: 'nounou' },
    { label: t('roles.papi'), value: 'papi' },
    { label: t('roles.mami'), value: 'mami' },
    { label: t('roles.autre'), value: 'autre' },
  ];

  const queryResult = query(userRef, where('userId', '==', user.uid));

  const onHandleModification = async () => {
    if (!babyIDPaste) {
      setError(t('error.enterCode'));
      return;
    }

    if (!babyValid) {
      setError(t('error.validCode'));
      return;
    }

    const queryResult = query(babiesRef, where('id', '==', babyIDPaste));
    console.log('queryResult :' + babyIDPaste);
    try {
      const querySnapshot = await getDocs(queryResult);
      querySnapshot.forEach(async (document) => {
        await updateDoc(doc(db, 'Baby', document.id), {
          user: [...document.data().user, { userID: user.uid, role: selectedRole }],
        }).then(() => {
          console.log('success');
          setBabyID(babyIDPaste);
        });
      });

      navigation.navigate('BabyList');

    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
        <TextInput
          style={styles.input}
          placeholder={t('placeholder.code')}
          keyboardType="email-address"
          autoCapitalize="none"
          clearButtonMode="always"
          value={babyIDPaste}
          onChangeText={(text) => setbabyIDPaste(text)}
        />

        <View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setIsRoleExpanded(!isRoleExpanded)}
          >
            <Text>{selectedRole ? roles.find(role => role.value === selectedRole).label : t('placeholders.role')}</Text>
          </TouchableOpacity>
          {isRoleExpanded && (
            <View style={styles.roleContainer}>
              {roles.map((role, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedRole(role.value);
                    setIsRoleExpanded(false);
                  }}
                  style={styles.roleOption}
                >
                  <Text>{role.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {selectedRole === 'autre' && (
          <View>
            <TextInput
              style={styles.input}
              placeholder={t('placeholders.otherRole')}
            />
          </View>
        )}

        <View>
          <Text style={styles.errorText}>{userError}</Text>
        </View>

        <View style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexDirection: 'column',
        }}>
          <TouchableOpacity style={styles.button} onPress={onHandleModification}>
            <Text style={styles.buttonText}>{t('validate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default JoinBaby;

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 10, backgroundColor: '#FDF1E7'
  },
  button: {
    backgroundColor: '#C75B4A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: 250
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#C75B4A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginTop: 10,
    width: '100%',
  },
  roleOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});