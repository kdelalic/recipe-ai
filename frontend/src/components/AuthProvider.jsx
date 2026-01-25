import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from '../utils/firebase';
import Spinner from './Spinner';

function AuthProvider({ children, isServer = false }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(() => {
    // On server, don't show loading state - render immediately with null user
    if (isServer) {
      return false;
    }
    return true; // Client: start in loading state
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

  return children(user);
}

export default AuthProvider;
