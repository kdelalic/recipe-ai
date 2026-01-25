import { useState } from 'react';
import { FaSave, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import api from '../utils/api';
import { useTheme } from '../components/ThemeProvider';
import { useAuth } from '../components/AuthProvider';
import { useLayoutContext } from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/Preferences.css';

function Preferences() {
  const user = useAuth();
  const { 
    imageGenerationEnabled = true, 
    setImageGenerationEnabled, 
    preferencesLoading = false 
  } = useLayoutContext() || {};

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLoggedIn = user && !user.isAnonymous;

  const handleSave = async () => {
    if (!isLoggedIn) {
      setError('Please sign in to save preferences');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/api/preferences', {
        imageGenerationEnabled,
      });
      setSuccess('Preferences saved successfully');
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences');
    }
    setSaving(false);
  };

  const { darkMode } = useTheme();
  const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--skeleton-base').trim() || (darkMode ? '#1e293b' : '#e5e7eb');
  const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--skeleton-highlight').trim() || (darkMode ? '#334155' : '#f3f4f6');

  if (preferencesLoading) {
    return (
      <ProtectedRoute user={user} allowGuest={false}>
      <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
        <div className="preferences-container">
          <h1>Preferences</h1>
          <div className="preference-section">
            <Skeleton height={18} width="50%" className="preference-skeleton-title" />
            <div className="preference-item">
              <div className="preference-info">
                <Skeleton height={16} width="60%" className="preference-skeleton-text" />
                <Skeleton height={14} width="90%" />
              </div>
              <Skeleton width={48} height={26} borderRadius={26} />
            </div>
          </div>
          <div className="preferences-actions">
            <Skeleton height={46} containerClassName="skeleton-button-container" />
            <Skeleton height={46} containerClassName="skeleton-button-container" />
          </div>
        </div>
      </SkeletonTheme>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute user={user} allowGuest={false}>
    <div className="preferences-container">
      <h1>Preferences</h1>

      {!isLoggedIn && (
        <p className="guest-notice">
          Sign in to save your preferences across devices.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div className="preference-section">
        <h2>Recipe Generation</h2>

        <label className="preference-item">
          <div className="preference-info">
            <span className="preference-label">Generate recipe images</span>
            <span className="preference-description">
              When enabled, AI will generate an image for each recipe. Disabling this may speed up recipe generation.
            </span>
          </div>
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={imageGenerationEnabled}
              onChange={(e) => setImageGenerationEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </div>
        </label>
      </div>

      <div className="preferences-actions">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving || !isLoggedIn}
        >
          <FaSave className="btn-icon" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        <button
          className="back-button"
          onClick={() => navigate('/')}
        >
          <FaArrowLeft className="btn-icon" />
          Back to Recipes
        </button>
      </div>
    </div>
    </ProtectedRoute>
  );
}

export default Preferences;
