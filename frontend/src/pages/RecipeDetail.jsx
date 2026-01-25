import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecipeView from '../components/RecipeView';
import RecipeSkeleton from '../components/RecipeSkeleton';
import api from '../utils/api';
import { computeRecipeDiffAsHtml } from '../utils/diffHelper';
import '../styles/RecipeDetail.css';

function RecipeDetail({ user, favoriteIds = [], toggleFavorite, isMobile, sidebarCollapsed, onToggleSidebar, wakeLockEnabled, onToggleWakeLock }) {
  const recipeRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [prevRecipe, setPrevRecipe] = useState(null);
  const [recipeUID, setRecipeUID] = useState('');
  const [prompt, setPrompt] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modification, setModification] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  const fetchRecipe = async () => {
    try {
      const response = await api.get(`/api/recipe/${id}`);
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = response.data;
      setRecipe(data.recipe);
      setPrevRecipe(data.recipe);
      setTimestamp(data.timestamp);
      setRecipeUID(data.uid);
      setDisplayName(data.displayName);
      setImageUrl(data.image_url || '');
      setPrompt(data.prompt || '');
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('There was an error fetching the recipe.');
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    setImageUrl('');
    fetchRecipe();
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this recipe? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      const response = await api.patch(`/api/recipe/${id}/archive`);
      if (response.status !== 200) throw new Error('Failed to archive recipe');
      navigate('/');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError('There was an error deleting the recipe.');
    }
  };

  const handleUpdateRecipe = async () => {
    if (!modification) return;
    setUpdateLoading(true);
    try {
      setPrevRecipe(recipe);
      const response = await api.post('/api/update-recipe', {
        id,
        original_recipe: recipe,
        modifications: modification,
      });
      if (response.status !== 200) throw new Error('Update failed');
      setRecipe(response.data.recipe);
      setModification('');

      // Scroll the recipe element into view after updating.
      if (recipeRef.current) {
        recipeRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError('There was an error updating the recipe.');
    }
    setUpdateLoading(false);
  };

  const handleRegenerate = async () => {
    if (!prompt) return;
    setRegenerateLoading(true);
    setError('');
    try {
      const response = await api.post('/api/generate-recipe', { prompt });
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = response.data;
      // Navigate to the new recipe
      navigate(`/recipe/${data.id}`);
    } catch (err) {
      console.error('Error regenerating recipe:', err);
      setError('There was an error regenerating the recipe.');
    }
    setRegenerateLoading(false);
  };

  // Compute the diff HTML for inline highlighting.
  const diffRecipe = prevRecipe !== recipe
    ? computeRecipeDiffAsHtml(prevRecipe, recipe)
    : recipe;

  return (
    <div className="recipe-detail-page">
      {loading ? (
        <RecipeSkeleton
          isMobile={isMobile}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
          showImageSkeleton={import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true'}
        />
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="recipe" ref={recipeRef}>
          <RecipeView
            recipe={diffRecipe}
            author={displayName}
            timestamp={timestamp}
            isFavorite={favoriteIds.includes(id)}
            onToggleFavorite={toggleFavorite}
            recipeId={id}
            isMobile={isMobile}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={onToggleSidebar}
            wakeLockEnabled={wakeLockEnabled}
            onToggleWakeLock={onToggleWakeLock}
            imageUrl={imageUrl}
            shareUrl={`${import.meta.env.VITE_API_URL}/api/share/recipe/${id}?origin=${window.location.origin}`}
          />
          {user && recipeUID === user.uid && (
            <div className="recipe-management-section">
              <div className="update-section">
                <input
                  type="text"
                  className="modification-input"
                  placeholder="Enter modifications (e.g., remove onions)"
                  value={modification}
                  onChange={(e) => setModification(e.target.value)}
                />
                <div className="modification-buttons">
                  <button type="submit" onClick={handleUpdateRecipe} disabled={updateLoading || regenerateLoading || !modification}>
                    {updateLoading ? 'Updating...' : 'Update Recipe'}
                  </button>
                  {prompt && (
                    <button type="button" onClick={handleRegenerate} disabled={updateLoading || regenerateLoading} className="regenerate-btn">
                      {regenerateLoading ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  )}
                </div>
              </div>
              <div className="recipe-actions">
                <button onClick={handleDelete} className="delete-btn">
                  Delete Recipe
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
