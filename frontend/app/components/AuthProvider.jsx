import { useEffect, useState, createContext, useContext } from 'react';
import { auth, onAuthStateChanged } from '../utils/firebase';
import Spinner from './Spinner';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children, isServer = false }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(() => {
    if (isServer) {
        return false;
    }
    return true;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return <Spinner />;
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
