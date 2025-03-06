import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from '../utils/firebase';
import Spinner from './Spinner';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingAuth) return <Spinner />;

  return children(user);
}

export default AuthProvider;
