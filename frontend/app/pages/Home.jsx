import { useState, useRef, useMemo, useEffect } from 'react';
import { FaMagic, FaRedo, FaEdit, FaUserPlus, FaTimes } from 'react-icons/fa';
import ChefHatIcon from '../components/ChefHatIcon';
import RecipeView from '../components/RecipeView';
import RecipeSkeleton from '../components/RecipeSkeleton';
import api from '../utils/api';
import '../styles/Home.css';
import ModifierChip from '../components/ModifierChip';
import { computeRecipeDiffAsHtml } from '../utils/diffHelper';

const GREETINGS = [
  "What are we cooking today?",
  "Hungry for something new?",
  "Let's whip up something delicious",
  "What's on the menu tonight?",
  "Ready to get cooking?",
  "Craving something special?",
  "Time to create some magic",
  "What flavors are you in the mood for?",
  "Let's turn ingredients into art",
  "What culinary adventure awaits?",
  "Feeling adventurous in the kitchen?",
  "What's your appetite telling you?",
  "Let's cook up something amazing",
  "What dish is calling your name?",
  "Ready to explore new flavors?",
];

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useLayoutContext } from '../components/Layout';

function Home() {
  const user = useAuth();
  const { 
    isMobile, 
    sidebarCollapsed, 
    onToggleSidebar, 
    favoriteIds, 
    toggleFavorite, 
    wakeLockEnabled, 
    onToggleWakeLock, 
    refreshHistory, 
    imageGenerationEnabled = true 
  } = useLayoutContext() || {};

  const location = useLocation();
  const recipeRef = useRef(null);
  const [input, setInput] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [prevRecipe, setPrevRecipe] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const envEnableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [modification, setModification] = useState('');
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  
  // Modifiers state
  const [complexity, setComplexity] = useState('standard');
  const [diet, setDiet] = useState('standard');
  const [time, setTime] = useState('any');
  const [servings, setServings] = useState('standard');

  // Handle reset from navigation (New Recipe button)
  useEffect(() => {
    if (location.state?.reset) {
      setInput('');
      setCurrentId('');
      setCurrentRecipe('');
      setPrevRecipe('');
      setImageUrl('');
      setError('');
      // Reset modifiers
      setComplexity('standard');
      setDiet('standard');
      setTime('any');
      setServings('standard');
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const hasRecipe = currentRecipe || loading;

  // Scroll to top when current recipe changes or loading starts
  useEffect(() => {
    if (currentId || loading) {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    }
  }, [currentId, loading]);

  // Prevent body scroll when on landing screen (centered mode) on mobile
  useEffect(() => {
    if (isMobile && !hasRecipe) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isMobile, hasRecipe]);

  const greeting = useMemo(() => {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentId('');
    setCurrentRecipe('');
    setImageUrl('');

    // Guest generation limit check
    if (!user) {
      const guestGenerations = parseInt(localStorage.getItem('guest_generations') || '0', 10);
      if (guestGenerations >= 1) {
        setShowSignupPrompt(true);
        setLoading(false);
        return;
      }
    }

    if (!input.trim()) {
      setError('Please enter some ingredients first.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/generate-recipe', { 
        prompt: input,
        complexity,
        diet,
        time,
        servings
      });
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = await response.data;
      const recipeData = data.recipe;
      
      // Increment guest generation count
      if (!user) {
        const currentCount = parseInt(localStorage.getItem('guest_generations') || '0', 10);
        localStorage.setItem('guest_generations', (currentCount + 1).toString());
      }

      setCurrentId(data.id);
      setCurrentRecipe(recipeData);
      setPrevRecipe(recipeData);
      if (envEnableImageGeneration && imageGenerationEnabled) {
        handleGenerateImage(recipeData, data.id);
      }
      if (refreshHistory) {
        refreshHistory();
      }
    } catch (err) {
      console.error('Error generating recipe:', err);
      setError('There was an error generating the recipe.');
    }
    setLoading(false);
  };

  const handleGenerateImage = async (recipe, recipeId) => {
    setImageLoading(true);
    try {
      const response = await api.post('/api/generate-image', { recipe, recipe_id: recipeId });
      if (response.status !== 200) throw new Error('Image generation failed');
      const data = await response.data;
      setImageUrl(data.image_url);
    } catch (err) {
      console.error('Error generating image:', err);
      // Don't show error for image generation failures - it's non-critical
    }
    setImageLoading(false);
  };

  const handleUpdateRecipe = async () => {
    if (!modification) return;
    setLoading(true);
    try {
      setPrevRecipe(currentRecipe);
      const response = await api.post('/api/update-recipe', {
        id: currentId,
        original_recipe: currentRecipe,
        modifications: modification,
      });
      if (response.status !== 200) throw new Error('Update failed');
      setCurrentRecipe(response.data.recipe);
      setModification('');

      // Scroll the recipe element into view
      if (recipeRef.current) {
        recipeRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError('There was an error updating the recipe.');
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    if (!input) return;
    setLoading(true);
    setError('');
    setCurrentId('');
    setCurrentRecipe('');
    setPrevRecipe('');
    setImageUrl('');

    try {
      const response = await api.post('/api/generate-recipe', { prompt: input });
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = await response.data;
      const recipeData = data.recipe;
      setCurrentId(data.id);
      setCurrentRecipe(recipeData);
      setPrevRecipe(recipeData);
      if (envEnableImageGeneration && imageGenerationEnabled) {
        handleGenerateImage(recipeData, data.id);
      }
      if (refreshHistory) {
        refreshHistory();
      }
    } catch (err) {
      console.error('Error regenerating recipe:', err);
      setError('There was an error regenerating the recipe.');
    }
    setLoading(false);
  };

  // Compute the diff HTML for inline highlighting.
  const diffRecipe = prevRecipe !== currentRecipe
    ? computeRecipeDiffAsHtml(prevRecipe, currentRecipe)
    : currentRecipe;

  return (
    <div className={`home-page ${!hasRecipe ? 'centered' : ''}`}>
      {!hasRecipe && (
        <>
          <ChefHatIcon className="home-icon" size={64} />
          <h1 className="greeting">{greeting}</h1>
        </>
      )}
      <form onSubmit={handleSubmit} className="recipe-form">
        <input
          type="text"
          placeholder="Enter ingredients, cuisine type, etc."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError('');
          }}
        />
        
        <div className="modifiers-container">
          <ModifierChip
            label="Complexity"
            value={complexity}
            onChange={setComplexity}
            defaultValue="standard"
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'standard', label: 'Standard' },
              { value: 'fancy', label: 'Fancy' },
            ]}
          />
          <ModifierChip
            label="Diet"
            value={diet}
            onChange={setDiet}
            defaultValue="standard"
            options={[
              { value: 'standard', label: 'No Diet' },
              { value: 'high protein', label: 'High Protein' },
              { value: 'low calorie', label: 'Low Calorie' },
              { value: 'low fat', label: 'Low Fat' },
              { value: 'low carb', label: 'Low Carb' },
              { value: 'junk', label: 'Junk Food' },
            ]}
          />
          <ModifierChip
            label="Time"
            value={time}
            onChange={setTime}
            defaultValue="any"
            options={[
              { value: 'any', label: 'Any Time' },
              { value: 'quick', label: 'Quick (< 30m)' },
              { value: 'medium', label: 'Standard (< 1hr)' },
              { value: 'slow', label: 'Slow Cook' },
            ]}
          />
          <ModifierChip
            label="Servings"
            value={servings}
            onChange={setServings}
            defaultValue="standard"
            options={[
              { value: 'standard', label: 'Standard (4)' },
              { value: 'single', label: 'Single (1)' },
              { value: 'pair', label: 'Date Night (2)' },
              { value: 'party', label: 'Party (10+)' },
            ]}
          />
        </div>
        <button type="submit" disabled={loading} className="generate-btn">
          <FaMagic className="btn-icon" />
          {loading ? 'Generating...' : 'Generate Recipe'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading && !currentRecipe ? (
        <RecipeSkeleton
          isMobile={isMobile}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
          showImageSkeleton={envEnableImageGeneration && imageGenerationEnabled}
        />
      ) : (
        currentRecipe && (
          <div className="recipe" ref={recipeRef}>
            <RecipeView
              recipe={diffRecipe}
              recipeId={currentId}
              isMobile={isMobile}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={onToggleSidebar}
              isFavorite={favoriteIds?.includes(currentId)}
              onToggleFavorite={toggleFavorite}
              wakeLockEnabled={wakeLockEnabled}
              onToggleWakeLock={onToggleWakeLock}
              shareUrl={currentId ? `${window.location.origin}/recipe/${currentId}` : undefined}
              imageUrl={imageUrl}
              imageLoading={envEnableImageGeneration && imageGenerationEnabled && imageLoading}
            />
            <div className="modification-section">
              <input
                type="text"
                placeholder="Enter modifications (e.g., remove onions)"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
              />
              <div className="modification-buttons">
                <button type="submit" onClick={handleUpdateRecipe} disabled={loading || !modification}>
                  <FaEdit className="btn-icon" />
                  {loading ? 'Updating...' : 'Update Recipe'}
                </button>
                <button type="button" onClick={handleRegenerate} disabled={loading} className="regenerate-btn">
                  <FaRedo className="btn-icon" />
                  {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          </div>
        )
      )}
      
      {showSignupPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Ready specifically for more?</h2>
            <p>Guest users can only generate one free recipe. Sign up to reset your limit and create unlimited recipes!</p>
            <div className="modal-actions">
              <Link to="/signup" className="modal-btn primary">
                <FaUserPlus className="btn-icon" />
                Sign Up
              </Link>
              <button 
                className="modal-btn secondary"
                onClick={() => setShowSignupPrompt(false)}
              >
                <FaTimes className="btn-icon" />
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
