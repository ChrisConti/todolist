import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { contractionsAuth } from '../config/contractionsFirebase';
import { isAdminEmail } from '../config/adminEmails';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAdmin(user?.email ? isAdminEmail(user.email) : false);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);

      // Check if email is in admin whitelist
      if (!isAdminEmail(email)) {
        throw new Error('Accès non autorisé. Seuls les administrateurs peuvent se connecter.');
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Erreur de connexion');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';
      if (!isAdminEmail(email)) {
        await firebaseSignOut(auth);
        throw new Error('Accès non autorisé. Seuls les administrateurs peuvent se connecter.');
      }
      // The same Google credential also opens the Suivi Contractions project (Contractions tab)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        signInWithCredential(contractionsAuth, credential).catch((err) =>
          console.error('Contractions project sign in error:', err)
        );
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Erreur de connexion Google');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await firebaseSignOut(contractionsAuth).catch(() => {});
      setError(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Erreur de déconnexion');
      throw err;
    }
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
