import { useState, useRef, useMemo } from 'react';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import RecipeView from '../components/RecipeView';
import RecipeSkeleton from '../components/RecipeSkeleton';
import api from '../utils/api';
import '../styles/Home.css';
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

function Home({ isMobile, sidebarCollapsed, onToggleSidebar, favorites, toggleFavorite, wakeLockEnabled, onToggleWakeLock }) {
  const recipeRef = useRef(null);
  const [input, setInput] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [prevRecipe, setPrevRecipe] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const enableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [modification, setModification] = useState('');

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
      const response = await api.post('/api/generate-recipe', { prompt: input });
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = await response.data;
      const recipeData = data.recipe;
      setCurrentId(data.id);
      setCurrentRecipe(recipeData);
      setPrevRecipe(recipeData);
      if (enableImageGeneration) {
        handleGenerateImage(recipeData, data.id);
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
              isFavorite={favorites?.includes(currentId)}
              onToggleFavorite={toggleFavorite}
              wakeLockEnabled={wakeLockEnabled}
              onToggleWakeLock={onToggleWakeLock}
              shareUrl={currentId ? `${window.location.origin}/recipe/${currentId}` : undefined}
              imageUrl={imageUrl}
              imageLoading={enableImageGeneration && imageLoading}
            />
            <div className="modification-section">
              <input
                type="text"
                placeholder="Enter modifications (e.g., remove pork belly)"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
              />
              <button type="submit" onClick={handleUpdateRecipe} disabled={loading || !modification}>
                {loading ? 'Updating...' : 'Update Recipe'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default Home;
