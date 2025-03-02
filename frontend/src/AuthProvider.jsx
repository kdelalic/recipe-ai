// AuthProvider.jsx
import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from './firebase';

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

  if (loadingAuth) return <div>Loading authentication...</div>;

  return children(user);
}

export default AuthProvider;
