import React, { createContext, useState } from "react";

export const AuthentificationUserContext = createContext({});
const AuthentificationUserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [babyID, setBabyID] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [usersList, setUsersList] = useState([]);

    

    return (
        <AuthentificationUserContext.Provider value={{ user, setUser, babyID, setBabyID, userInfo, setUserInfo, usersList, setUsersList}} >
            {children}
        </AuthentificationUserContext.Provider>
    )
}

export default AuthentificationUserProvider;