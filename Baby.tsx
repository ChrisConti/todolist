import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';

import { auth, db, userRef } from './config';
import { FieldValue, addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import AuthentificationUserProvider, { AuthentificationUserContext } from './Context/AuthentificationContext';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';
import Boy from './assets/garcon.svg';
import Girl from './assets/fille.svg';

const Baby = ({ navigation }) => {
    const [name, setName] = useState('');
    const [birth, setBirth] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedRole, setSelectedRole] = useState('');
    const [otherRole, setOtherRole] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [isRoleExpanded, setIsRoleExpanded] = useState(false);
    const uniqueId = uuid.v4();
    const [userError, setError] = useState('');

    const { user, setUser, babyID, setBabyID } = useContext(AuthentificationUserContext);
    const { t } = useTranslation();

    const images = [
        { id: 0, type: 'Boy', rq: require('./assets/boy.png') },
        { id: 1, type: 'Girl', rq: require('./assets/girl.png') },
    ];

    const roles = [
        { label: t('roles.papa'), value: 'papa' },
        { label: t('roles.maman'), value: 'maman' },
        { label: t('roles.nounou'), value: 'nounou' },
        { label: t('roles.papi'), value: 'papi' },
        { label: t('roles.mami'), value: 'mami' },
        { label: t('roles.autre'), value: 'autre' },
    ];

    useEffect(() => {
        if (!user) return;
    }, []);

    const handleCreateBaby = async () => {
        if (name.length < 2) {
            console.log('name');
            setError(t('errors.name'));
            return;
        }
        if (birthdate.length < 8) {
            setError(t('errors.birthdate'));
            return;
        }
        if (selectedRole === '') {
            setError(t('errors.role'));
            return;
        }
        if (selectedRole === 'autre' && otherRole.length < 2) {
            setError(t('errors.otherRole'));
            return;
        }
        setBabyID(uniqueId);
        await addDoc(collection(db, "Baby"), {
            id: uniqueId,
            type: images[selectedImage].type,
            name: name,
            birthDate: birth,
            CreatedDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            user: [user.uid,],
            tasks: [],
            role: selectedRole,
            roleAutre: selectedRole === 'autre' ? otherRole : '',
            admin: user.uid,
        });
        navigation.navigate('BabyList');
    };

    const handleChange = (text) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');
        // Add slashes after day and month
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
            formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
        }
        setBirthdate(formatted);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, padding: 10, backgroundColor: '#FDF1E7' }}>
                <ScrollView>
                    <View style={{ justifyContent: 'center' }}>
                        <View style={{ flexDirection: "row", justifyContent: 'center' }}>
                            <TouchableOpacity
                                onPress={() => setSelectedImage(0)}
                                style={[selectedImage == 0 ? styles.imageSelected : styles.imageNonSelected]}
                            >
                                <Boy height={90} width={90} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSelectedImage(1)}
                                style={[selectedImage == 1 ? styles.imageSelected : styles.imageNonSelected]}
                            >
                                <Girl height={90} width={90} />
                            </TouchableOpacity>
                        </View>
                        <View>
                            <TextInput
                                style={styles.input}
                                placeholder={t('placeholders.name')}
                                autoCapitalize="none"
                                value={name}
                                onChangeText={(text) => setName(text)}
                            />
                        </View>

                        <View style={styles.container}>
                            <TextInput
                                style={styles.input}
                                value={birthdate}
                                onChangeText={handleChange}
                                keyboardType="numeric"
                                placeholder={t('placeholders.birthdate')}
                                maxLength={10} // Maximum length for DD/MM/YYYY
                            />
                        </View>
                        
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
                                    autoCapitalize="none"
                                    value={otherRole}
                                    onChangeText={(text) => setOtherRole(text)}
                                />
                            </View>
                        )}
                    </View>
                </ScrollView>
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
                    <View>
                        <Text style={styles.errorText}>{userError}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            handleCreateBaby();
                            //setError('');
                        }}
                    >
                        <Text style={styles.buttonText}>{t('buttons.validate')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    image: {
        width: "100%",
        height: "105%",
        resizeMode: 'cover',
        backgroundColor: 'blue'
    },
    imageSelected: {
        width: 120,
        height: 120,
        resizeMode: 'cover',
        borderColor: '#C75B4A',
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: "row",
    },
    imageNonSelected: {
        width: 120,
        height: 120,
        resizeMode: 'cover',
        borderWidth: 5,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'transparent',
        flexDirection: "row",
    },
    input: {
        width: '100%',
        height: 50,
        borderBottomWidth: 1,
        borderColor: '#C75B4A',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#C75B4A', // Dark blue button background
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
        width: 250,
    },
    buttonText: {
        color: '#fff', // White text color
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        fontWeight: 'bold',
    },
    roleContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
    },
    roleOption: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});

export default Baby;