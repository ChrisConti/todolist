import { useContext, useEffect, useState } from 'react';
import { AuthentificationUserContext } from '../Context/AuthentificationContext';
import { User } from 'firebase/auth';
import { log } from '../utils/logger';

/**
 * Hook sécurisé pour accéder à l'utilisateur authentifié
 * Garantit que user n'est jamais null quand on l'utilise
 */
export function useAuthUser(): { 
  user: User | null; 
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user } = useContext(AuthentificationUserContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait a bit for auth to settle
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [user]);

  const isAuthenticated = user !== null && user.uid !== undefined;

  if (!isAuthenticated && !isLoading) {
    log.warn('User accessed but not authenticated', 'useAuthUser');
  }

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook qui force la présence d'un user authentifié
 * Redirige vers l'écran de connexion si pas de user
 */
export function useRequireAuth(navigation?: any): User | null {
  const { user } = useContext(AuthentificationUserContext);

  useEffect(() => {
    if (!user && navigation) {
      log.warn('User required but not authenticated, redirecting to login', 'useRequireAuth');
      navigation.navigate('Connection');
    }
  }, [user, navigation]);

  return user;
}

/**
 * Récupère l'UID de manière sécurisée
 */
export function useUserUID(): string | null {
  const { user } = useContext(AuthentificationUserContext);
  return user?.uid || null;
}
