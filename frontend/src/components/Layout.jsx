import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineMenuAlt2, HiOutlinePlus, HiOutlineDotsVertical, HiOutlineTrash } from 'react-icons/hi';
import { FaUserCircle, FaStar, FaRegStar } from 'react-icons/fa';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { auth } from '../utils/firebase';
import api from '../utils/api';
import HistorySkeleton from './HistorySkeleton';
import { useTheme } from './ThemeProvider';
import '../styles/Layout.css';
import ChefHatIcon from './ChefHatIcon';

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
  // Check if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [favoriteIds, setFavoriteIds] = useState(() => {
    const saved = localStorage.getItem('favoriteIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(() => {
    const saved = localStorage.getItem('keepScreenAwake');
    return saved === 'true';
  });
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const dropdownRef = useRef(null);
  const historyMenuRef = useRef(null);
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

  // Fetch preferences from database for logged-in users
  const fetchPreferences = useCallback(async () => {
    if (!isLoggedIn) {
      setPreferencesLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/preferences');
      if (response.status === 200) {
        const prefs = response.data.preferences || {};
        setImageGenerationEnabled(prefs.imageGenerationEnabled !== false);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
    setPreferencesLoading(false);
  }, [isLoggedIn]);

  // Fetch favorites from database for logged-in users
  const fetchFavorites = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const response = await api.get('/api/favorites');
      if (response.status === 200) {
        const dbFavorites = response.data.favorites || [];
        const dbFavoriteIds = response.data.favoriteIds || [];
        setFavorites(dbFavorites);
        setFavoriteIds(dbFavoriteIds);
        localStorage.setItem('favorites', JSON.stringify(dbFavorites));
        localStorage.setItem('favoriteIds', JSON.stringify(dbFavoriteIds));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      // Fall back to localStorage
    }
  }, [isLoggedIn]);

  // Load preferences and favorites when user changes
  useEffect(() => {
    if (user && isLoggedIn) {
      fetchPreferences();
      fetchFavorites();
    } else {
      setPreferencesLoading(false);
    }
  }, [user, isLoggedIn, fetchPreferences, fetchFavorites]);

  // Toggle favorite - uses POST/DELETE endpoints
  const toggleFavorite = async (recipeId, title, e) => {
    e.preventDefault();
    e.stopPropagation();

    const isFavorited = favoriteIds.includes(recipeId);

    // Optimistically update UI
    if (isFavorited) {
      setFavoriteIds(prev => prev.filter(id => id !== recipeId));
      setFavorites(prev => prev.filter(f => (f.id || f) !== recipeId));
    } else {
      setFavoriteIds(prev => [...prev, recipeId]);
      setFavorites(prev => [...prev, { id: recipeId, title }]);
    }

    // Persist to server
    if (isLoggedIn) {
      try {
        if (isFavorited) {
          await api.delete(`/api/favorites/${recipeId}`);
        } else {
          await api.post(`/api/favorites/${recipeId}`, { title });
        }
      } catch (err) {
        console.error('Error toggling favorite:', err);
        // Revert on error
        fetchFavorites();
      }
    } else {
      // For non-logged-in users, just save to localStorage
      const newFavorites = isFavorited
        ? favorites.filter(f => (f.id || f) !== recipeId)
        : [...favorites, { id: recipeId, title }];
      const newFavoriteIds = isFavorited
        ? favoriteIds.filter(id => id !== recipeId)
        : [...favoriteIds, recipeId];
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      localStorage.setItem('favoriteIds', JSON.stringify(newFavoriteIds));
    }
  };

  // Delete/archive recipe from history
  const deleteRecipe = async (recipeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setHistoryMenuOpen(null);

    // Optimistically remove from UI
    setHistory(prev => prev.filter(item => item.id !== recipeId));
    // Also remove from favorites if present
    setFavoriteIds(prev => prev.filter(id => id !== recipeId));
    setFavorites(prev => prev.filter(f => (f.id || f) !== recipeId));

    // If we're viewing this recipe, navigate away
    if (currentRecipeId === recipeId) {
      navigate('/');
    }

    try {
      await api.patch(`/api/recipe/${recipeId}/archive`);
    } catch (err) {
      console.error('Error deleting recipe:', err);
      // Refresh history on error
      fetchHistory(0, false);
    }
  };

  // Get the appropriate list based on filter state
  // When showing favorites, use the favorites array which already has titles
  // Favorites are sorted by timestamp (newest first) from the backend
  const displayHistory = showFavoritesOnly
    ? [...favorites]
        .sort((a, b) => {
          const timeA = a.timestamp || '';
          const timeB = b.timestamp || '';
          return timeB.localeCompare(timeA);
        })
        .map(f => ({ id: f.id || f, title: f.title || '' }))
    : history;

  // Filter history based on search
  const filteredHistory = displayHistory.filter(item => {
    return item.title.toLowerCase().includes(searchQuery.toLowerCase());
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
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target)) {
        setHistoryMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Global Keydown handler for Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        if (isMobile) {
          setSidebarCollapsed(true);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

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
      {/* Overlay for mobile */}
      {isMobile && !sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={() => setSidebarCollapsed(true)} />
      )}

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <ChefHatIcon className="sidebar-logo-icon" size={32} />
            <h1 className="sidebar-logo">RecipeLab</h1>
          </div>
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
        <Link
          to="/"
          state={{ reset: true }}
          className={`new-recipe-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => isMobile && setSidebarCollapsed(true)}
        >
          <HiOutlinePlus className="new-recipe-icon" />
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
          {isLoggedIn && (
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
          )}
        </div>
        <div
          className={`sidebar-content ${sidebarCollapsed ? 'collapsed' : ''}`}
          ref={historyListRef}
          onScroll={handleScroll}
        >
          {historyLoading ? (
            <HistorySkeleton />
          ) : filteredHistory.length > 0 ? (
            <div className={`history-list ${historyMenuOpen !== null ? 'dropdown-open' : ''}`}>
              {filteredHistory.map((item, index) => (
                <Link
                  key={index}
                  to={`/recipe/${item.id}`}
                  className={`history-item ${currentRecipeId === item.id ? 'active' : ''}`}
                  onClick={() => isMobile && setSidebarCollapsed(true)}
                >
                  <span className="history-item-title">{item.title}</span>
                  {isLoggedIn && !showFavoritesOnly && (
                    <div 
                      className="history-item-menu-container"
                      ref={historyMenuOpen === item.id ? historyMenuRef : null}
                    >
                      <button
                        className={`history-item-menu-btn ${historyMenuOpen === item.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHistoryMenuOpen(historyMenuOpen === item.id ? null : item.id);
                        }}
                        aria-label="More options"
                      >
                        <HiOutlineDotsVertical size={16} />
                      </button>
                      {historyMenuOpen === item.id && (
                        <div className="history-item-dropdown">
                          <button
                            className={`history-dropdown-item ${favoriteIds.includes(item.id) ? 'is-favorite' : ''}`}
                            onClick={(e) => {
                              toggleFavorite(item.id, item.title, e);
                              setHistoryMenuOpen(null);
                            }}
                          >
                            {favoriteIds.includes(item.id) ? <FaStar size={14} /> : <FaRegStar size={14} />}
                            <span>{favoriteIds.includes(item.id) ? 'Unfavorite' : 'Favorite'}</span>
                          </button>
                          <button
                            className="history-dropdown-item delete"
                            onClick={(e) => deleteRecipe(item.id, e)}
                          >
                            <HiOutlineTrash size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              ))}
              {loadingMore && <div className="history-loading">Loading...</div>}
            </div>
          ) : showFavoritesOnly ? (
            <p className="no-history">{searchQuery ? 'No matching favorites found.' : 'No favorites yet.'}</p>
          ) : searchQuery ? (
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
                {isLoggedIn && (
                  <Link to="/preferences" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Preferences
                  </Link>
                )}
                {user.isAnonymous && (
                  <button onClick={handleSignUp} className="dropdown-item">
                    Sign Up
                  </button>
                )}
                <button onClick={handleSignOut} className="dropdown-item">
                  {user.isAnonymous ? 'Exit Guest Mode' : 'Sign Out'}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
      <main className="main-content">
        {isValidElement(children)
          ? cloneElement(children, {
              favoriteIds,
              toggleFavorite: isLoggedIn ? toggleFavorite : null,
              isMobile,
              sidebarCollapsed,
              onToggleSidebar: () => setSidebarCollapsed(false),
              wakeLockEnabled,
              onToggleWakeLock: toggleWakeLock,
              refreshHistory: () => fetchHistory(0, false),
              imageGenerationEnabled,
              setImageGenerationEnabled,
              preferencesLoading,
            })
          : children}
      </main>
    </div>
  );
}

export default Layout;
