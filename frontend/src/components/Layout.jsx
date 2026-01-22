import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { FaUserCircle, FaStar, FaRegStar } from 'react-icons/fa';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { auth } from '../utils/firebase';
import api from '../utils/api';
import HistorySkeleton from './HistorySkeleton';
import { useTheme } from './ThemeProvider';
import '../styles/Layout.css';

function Layout({ children, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(() => {
    const saved = localStorage.getItem('keepScreenAwake');
    return saved === 'true';
  });
  const dropdownRef = useRef(null);
  const historyListRef = useRef(null);

  const LIMIT = 25;

  // Check if user is logged in (not anonymous)
  const isLoggedIn = user && !user.isAnonymous;

  // Wake lock management
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => setWakeLock(null));
      } catch (err) {
        console.error('Wake lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
    }
  }, [wakeLock]);

  const toggleWakeLock = () => {
    const newValue = !wakeLockEnabled;
    setWakeLockEnabled(newValue);
    localStorage.setItem('keepScreenAwake', String(newValue));
  };

  // Request/release wake lock based on enabled state
  useEffect(() => {
    if (wakeLockEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [wakeLockEnabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wakeLockEnabled, requestWakeLock]);

  // Fetch favorites from database for logged-in users
  const fetchFavorites = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const response = await api.get('/api/favorites');
      if (response.status === 200) {
        const dbFavorites = response.data.favorites || [];
        setFavorites(dbFavorites);
        localStorage.setItem('favorites', JSON.stringify(dbFavorites));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      // Fall back to localStorage
    }
  }, [isLoggedIn]);

  // Load favorites when user changes
  useEffect(() => {
    if (user && isLoggedIn) {
      fetchFavorites();
    }
  }, [user, isLoggedIn, fetchFavorites]);

  // Save favorites to localStorage (always) and database (for logged-in users)
  const saveFavorites = useCallback(async (newFavorites) => {
    localStorage.setItem('favorites', JSON.stringify(newFavorites));

    if (isLoggedIn) {
      try {
        await api.put('/api/favorites', { favorites: newFavorites });
      } catch (err) {
        console.error('Error saving favorites to database:', err);
      }
    }
  }, [isLoggedIn]);

  const toggleFavorite = async (recipeId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const newFavorites = favorites.includes(recipeId)
      ? favorites.filter(id => id !== recipeId)
      : [...favorites, recipeId];

    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  };

  // Filter history based on search and favorites
  const filteredHistory = history.filter(item => {
    const matchesSearch = item.recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = showFavoritesOnly ? favorites.includes(item.id) : true;
    return matchesSearch && matchesFavorites;
  });

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

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isMobile, sidebarCollapsed]);

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
          <div className="sidebar-header-actions">
            <button
              className="theme-toggle"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              data-tooltip-id="tooltip"
              data-tooltip-content={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
            </button>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-tooltip-id="tooltip"
              data-tooltip-content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <HiOutlineMenuAlt2 size={20} />
            </button>
          </div>
        </div>
        <Link to="/" className={`new-recipe-btn ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <span className="new-recipe-icon">+</span>
          New Recipe
        </Link>
        <div className={`sidebar-filters ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <input
            type="text"
            className="search-input"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`favorites-filter ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            aria-label={showFavoritesOnly ? 'Show all recipes' : 'Show favorites only'}
            data-tooltip-id="tooltip"
            data-tooltip-content={showFavoritesOnly ? 'Show all recipes' : 'Show favorites only'}
          >
            {showFavoritesOnly ? <FaStar size={14} /> : <FaRegStar size={14} />}
            Favorites
          </button>
        </div>
        <div
          className={`sidebar-content ${sidebarCollapsed ? 'collapsed' : ''}`}
          ref={historyListRef}
          onScroll={handleScroll}
        >
          {historyLoading ? (
            <HistorySkeleton />
          ) : filteredHistory.length > 0 ? (
            <div className="history-list">
              {filteredHistory.map((item, index) => (
                <Link
                  key={index}
                  to={`/recipe/${item.id}`}
                  className={`history-item ${currentRecipeId === item.id ? 'active' : ''}`}
                >
                  <span className="history-item-title">{item.recipe.title}</span>
                  <button
                    className={`favorite-btn ${favorites.includes(item.id) ? 'is-favorite' : ''}`}
                    onClick={(e) => toggleFavorite(item.id, e)}
                    aria-label={favorites.includes(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={favorites.includes(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.includes(item.id) ? <FaStar size={12} /> : <FaRegStar size={12} />}
                  </button>
                </Link>
              ))}
              {loadingMore && <div className="history-loading">Loading...</div>}
            </div>
          ) : searchQuery || showFavoritesOnly ? (
            <p className="no-history">No matching recipes found.</p>
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
        {isValidElement(children)
          ? cloneElement(children, {
              favorites,
              toggleFavorite,
              isMobile,
              sidebarCollapsed,
              onToggleSidebar: () => setSidebarCollapsed(false),
              wakeLockEnabled,
              onToggleWakeLock: toggleWakeLock,
            })
          : children}
      </main>
    </div>
  );
}

export default Layout;
