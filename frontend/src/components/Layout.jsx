import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { FaUserCircle } from 'react-icons/fa';
import { auth } from '../utils/firebase';
import api from '../utils/api';
import HistorySkeleton from './HistorySkeleton';
import '../styles/Layout.css';

function Layout({ children, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const historyListRef = useRef(null);

  const LIMIT = 25;

  const fetchHistory = async (currentOffset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    }
    try {
      const response = await api.get(`/api/recipe-history?limit=${LIMIT}&offset=${currentOffset}`);
      if (response.status !== 200) {
        throw new Error('Network response was not ok');
      }
      const data = await response.data;
      const newHistory = data.history || [];

      if (append) {
        setHistory(prev => [...prev, ...newHistory]);
      } else {
        setHistory(newHistory);
      }

      setHasMore(newHistory.length === LIMIT);
      setOffset(currentOffset + newHistory.length);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
    setHistoryLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

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

  // Get current recipe ID from URL if on recipe detail page
  const currentRecipeId = location.pathname.startsWith('/recipe/')
    ? location.pathname.split('/recipe/')[1]
    : null;

  // Check if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Infinite scroll handler
  const handleScroll = () => {
    const el = historyListRef.current;
    if (!el || loadingMore || !hasMore) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) {
      fetchHistory(offset, true);
    }
  };

  // Load more if content doesn't fill the container
  useEffect(() => {
    const el = historyListRef.current;
    if (!el || historyLoading || loadingMore || !hasMore) return;

    if (el.scrollHeight <= el.clientHeight && history.length > 0) {
      fetchHistory(offset, true);
    }
  }, [history, historyLoading, loadingMore, hasMore]);

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile header */}
      <div className="mobile-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt2 size={20} />
        </button>
        <h1 className="mobile-logo">Recipe AI</h1>
      </div>

      {/* Overlay for mobile */}
      {isMobile && !sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={() => setSidebarCollapsed(true)} />
      )}

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">Recipe AI</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <HiOutlineMenuAlt2 size={20} />
          </button>
        </div>
        <Link to="/" className={`new-recipe-btn ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <span className="new-recipe-icon">+</span>
          New Recipe
        </Link>
        <div
          className={`sidebar-content ${sidebarCollapsed ? 'collapsed' : ''}`}
          ref={historyListRef}
          onScroll={handleScroll}
        >
          {historyLoading ? (
            <HistorySkeleton />
          ) : history.length > 0 ? (
            <div className="history-list">
              {history.map((item, index) => (
                <Link
                  key={index}
                  to={`/recipe/${item.id}`}
                  className={`history-item ${currentRecipeId === item.id ? 'active' : ''}`}
                >
                  {item.recipe.title}
                </Link>
              ))}
              {loadingMore && <div className="history-loading">Loading...</div>}
            </div>
          ) : (
            <p className="no-history">No recipes generated yet.</p>
          )}
        </div>
        {user && (
          <div className={`sidebar-footer ${sidebarCollapsed ? 'collapsed' : ''}`} ref={dropdownRef}>
            <button className="profile-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <FaUserCircle size={24} />
              <span className="profile-name">{user.displayName || user.email || 'Guest'}</span>
            </button>
            {dropdownOpen && (
              <div className="profile-dropdown">
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
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
