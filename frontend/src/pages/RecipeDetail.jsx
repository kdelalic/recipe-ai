import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import Header from '../components/Header';
import api from '../utils/api';
import { computeInlineDiff } from '../utils/diffHelper';
import '../styles/RecipeDetail.css';

function RecipeDetail({ user }) {
  const recipeRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState('');
  const [prevRecipe, setPrevRecipe] = useState('');
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
      
      // Scroll the recipe element into view
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
  const diffHtml = prevRecipe !== recipe ? computeInlineDiff(prevRecipe, recipe) : recipe;

  return (
    <div className="App">
      <Header user={user} />
      <Link to="/" className="link-button">Back to Home</Link>
      {loading ? (
        <p>Loading recipe...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="recipe" ref={recipeRef}>
          <div className="recipe-info">
            <p>{displayName}</p>
            <p>
              {new Date(timestamp).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{diffHtml}</ReactMarkdown>
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
              <button onClick={handleDelete} className="link-button" style={{ marginTop: '1rem' }}>
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
