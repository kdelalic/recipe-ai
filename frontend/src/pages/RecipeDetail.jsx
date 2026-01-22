import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RecipeView from '../components/RecipeView';
import RecipeSkeleton from '../components/RecipeSkeleton';
import api from '../utils/api';
import { computeRecipeDiffAsHtml } from '../utils/diffHelper';
import '../styles/RecipeDetail.css';

function RecipeDetail({ user, favorites = [], toggleFavorite, isMobile, sidebarCollapsed, onToggleSidebar, wakeLockEnabled, onToggleWakeLock }) {
  const recipeRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [prevRecipe, setPrevRecipe] = useState(null);
  const [recipeUID, setRecipeUID] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modification, setModification] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

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
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('There was an error fetching the recipe.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipe();
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
        />
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="recipe" ref={recipeRef}>
          <RecipeView
            recipe={diffRecipe}
            author={displayName}
            timestamp={timestamp}
            isFavorite={favorites.includes(id)}
            onToggleFavorite={toggleFavorite}
            recipeId={id}
            isMobile={isMobile}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={onToggleSidebar}
            wakeLockEnabled={wakeLockEnabled}
            onToggleWakeLock={onToggleWakeLock}
          />
          {user && recipeUID === user.uid && (
            <div className="update-section" style={{ marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Enter modifications (e.g., remove pork belly)"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
              />
              <button type="submit" onClick={handleUpdateRecipe} disabled={updateLoading || !modification}>
                {updateLoading ? 'Updating...' : 'Update Recipe'}
              </button>
            </div>
          )}
          {user && recipeUID === user.uid && (
            <div className="recipe-actions">
              <button onClick={handleDelete} style={{ marginTop: '1rem' }}>
                Delete Recipe
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
