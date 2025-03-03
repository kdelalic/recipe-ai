import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import '../styles/Header.css';

function Header({ user }) {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await auth.signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <header className="header">
      <Link to="/" className="logo">AI Recipe Generator</Link>
      {user && (
        <button className="link-button" onClick={handleSignOut}>
          Sign Out
        </button>
      )}
    </header>
  );
}

export default Header;
