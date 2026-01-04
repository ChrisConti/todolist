import React, { createContext, useState, ReactNode, useEffect } from "react";
import { User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUserContextType, UserInfo } from '../types';
import { log } from '../utils/logger';

export const AuthentificationUserContext = createContext<AuthUserContextType>({
    user: null,
    setUser: () => {},
    babyID: null,
    setBabyID: () => {},
    userInfo: null,
    setUserInfo: () => {},
    usersList: [],
    setUsersList: () => {},
});

interface AuthentificationUserProviderProps {
    children: ReactNode;
}

const AuthentificationUserProvider: React.FC<AuthentificationUserProviderProps> = ({ children }) => {
    log.debug('Initializing AuthentificationUserProvider', 'Context');
    const [user, setUser] = useState<User | null>(null);
    const [babyID, setBabyID] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [usersList, setUsersList] = useState<string[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load persisted data on mount
    useEffect(() => {
        loadPersistedData();
    }, []);

    // Persist babyID when it changes
    useEffect(() => {
        if (isHydrated) {
            persistBabyID(babyID);
        }
    }, [babyID, isHydrated]);

    const loadPersistedData = async () => {
        try {
            const persistedBabyID = await AsyncStorage.getItem('babyID');
            if (persistedBabyID) {
                log.debug(`Restored babyID from storage: ${persistedBabyID}`, 'Context');
                setBabyID(persistedBabyID);
            }
        } catch (error) {
            log.error('Failed to load persisted data', 'Context', error);
        } finally {
            setIsHydrated(true);
        }
    };

    const persistBabyID = async (id: string | null) => {
        try {
            if (id) {
                await AsyncStorage.setItem('babyID', id);
                log.debug(`Persisted babyID: ${id}`, 'Context');
            } else {
                await AsyncStorage.removeItem('babyID');
                log.debug('Removed persisted babyID', 'Context');
            }
        } catch (error) {
            log.error('Failed to persist babyID', 'Context', error);
        }
    };

    log.debug('Rendering AuthentificationUserProvider', 'Context');

    return (
        <AuthentificationUserContext.Provider value={{ user, setUser, babyID, setBabyID, userInfo, setUserInfo, usersList, setUsersList}} >
            {children}
        </AuthentificationUserContext.Provider>
    )
}

export default AuthentificationUserProvider;