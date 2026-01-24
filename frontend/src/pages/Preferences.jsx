import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Preferences.css';

function Preferences({ user }) {
  const navigate = useNavigate();
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!isLoggedIn) {
        setLoading(false);
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
        setError('Failed to load preferences');
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [isLoggedIn]);

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

  if (loading) {
    return (
      <div className="preferences-container">
        <p className="loading-text">Loading preferences...</p>
      </div>
    );
  }

  return (
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
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        <button
          className="back-button"
          onClick={() => navigate('/')}
        >
          Back to Recipes
        </button>
      </div>
    </div>
  );
}

export default Preferences;
