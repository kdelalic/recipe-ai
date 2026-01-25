import { useState, useRef, useMemo, useEffect } from 'react';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
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

import { useLocation } from 'react-router-dom';

function Home({ isMobile, sidebarCollapsed, onToggleSidebar, favoriteIds, toggleFavorite, wakeLockEnabled, onToggleWakeLock, refreshHistory }) {
  const location = useLocation();
  const recipeRef = useRef(null);
  const [input, setInput] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [prevRecipe, setPrevRecipe] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const envEnableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [modification, setModification] = useState('');
  
  // Modifiers state
  const [complexity, setComplexity] = useState('standard');
  const [diet, setDiet] = useState('standard');
  const [time, setTime] = useState('any');
  const [servings, setServings] = useState('standard');

  // Fetch user preferences for image generation
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.get('/api/preferences');
        if (response.status === 200) {
          const prefs = response.data.preferences || {};
          setImageGenerationEnabled(prefs.imageGenerationEnabled !== false);
        }
      } catch (err) {
        // Default to enabled if fetch fails
        console.error('Error fetching preferences:', err);
      }
    };
    fetchPreferences();
    fetchPreferences();
  }, []);

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
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const hasRecipe = currentRecipe || loading;

  return (
    <div className={`home-page ${!hasRecipe ? 'centered' : ''}`}>
      {!hasRecipe && isMobile && sidebarCollapsed && onToggleSidebar && (
        <button
          className="mobile-menu-btn top-left"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt2 size={20} />
        </button>
      )}
      {!hasRecipe && (
        <h1 className="greeting">{greeting}</h1>
      )}
      <form onSubmit={handleSubmit} className="recipe-form">
        <input
          type="text"
          placeholder="Enter ingredients, cuisine type, etc."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        
        <div className="modifiers-container">
          <ModifierChip
            label="Complexity"
            value={complexity}
            onChange={setComplexity}
            defaultValue="standard"
            options={[
              { value: 'simple', label: 'Simple' },
              { value: 'standard', label: 'Standard Complexity' },
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
              { value: 'healthy', label: 'Healthy (High Protein)' },
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
        <button type="submit" disabled={loading || !input}>
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
                placeholder="Enter modifications (e.g., remove pork belly)"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
              />
              <div className="modification-buttons">
                <button type="submit" onClick={handleUpdateRecipe} disabled={loading || !modification}>
                  {loading ? 'Updating...' : 'Update Recipe'}
                </button>
                <button type="button" onClick={handleRegenerate} disabled={loading} className="regenerate-btn">
                  {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default Home;
