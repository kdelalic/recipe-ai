// pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import '../styles/Login.css';
import ChefHatIcon from '../components/ChefHatIcon';

import { getAuthErrorMessage } from '../utils/authErrors';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const handleAnonymousLogin = async () => {
    setError('');
    try {
      await signInAnonymously(auth);
      navigate('/');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <ChefHatIcon className="login-logo" size={48} />
          <h1>Login</h1>
        </div>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="submit" className="login-button">Login</button>
        </form>
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="toggle-auth">Sign Up</Link>
        </p>
        <hr />
        <button onClick={handleAnonymousLogin}>Continue as Guest</button>
      </div>
    </div>
  );
}

export default Login;
