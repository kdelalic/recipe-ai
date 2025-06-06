// pages/SignUp.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { EmailAuthProvider, createUserWithEmailAndPassword, linkWithCredential, updateProfile } from 'firebase/auth';
import '../styles/Login.css';

function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        // If the current user is anonymous, link the email/password credential to upgrade the account.
        const credential = EmailAuthProvider.credential(email, password);
        userCredential = await linkWithCredential(auth.currentUser, credential);
      } else {
        // Otherwise, create a new user account.
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      // Update the display name on the user profile.
      await updateProfile(auth.currentUser, { displayName });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h1>Sign Up</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSignUp}>
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="signup-button">Sign Up</button>
      </form>
      <p>
        Already have an account? <Link to="/login" className="toggle-auth">Login</Link>
      </p>
    </div>
  );
}

export default SignUp;
