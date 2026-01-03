import React, { createContext, useState, ReactNode } from "react";
import { User } from 'firebase/auth';
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

    log.debug('Rendering AuthentificationUserProvider', 'Context');

    return (
        <AuthentificationUserContext.Provider value={{ user, setUser, babyID, setBabyID, userInfo, setUserInfo, usersList, setUsersList}} >
            {children}
        </AuthentificationUserContext.Provider>
    )
}

export default AuthentificationUserProvider;