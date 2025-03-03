import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/Header.css';

function Header({ user }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <Link to="/" className="logo">AI Recipe Generator</Link>
      {user && (
        <div className="profile-menu" ref={dropdownRef}>
          <FaUserCircle className="profile-icon" onClick={toggleDropdown} />
          {dropdownOpen && (
            <div className="dropdown">
              {user.isAnonymous && (
                <button onClick={handleSignUp} className="dropdown-item">
                  Sign Up
                </button>
              )}
              <button onClick={handleSignOut} className="dropdown-item">
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
