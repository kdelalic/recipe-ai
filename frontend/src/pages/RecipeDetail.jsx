import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../utils/api';
import '../styles/Home.css';

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modification, setModification] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchRecipe = async () => {
    try {
      const response = await api.get(`/api/recipe/${id}`);
      if (response.status !== 200) throw new Error('Network response was not ok');
      setRecipe(response.data.recipe);
      setTimestamp(response.data.timestamp);
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
    // Add confirmation before deletion
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
      const response = await api.post('/api/update-recipe', {
        id,  // Recipe ID from the URL parameters or state.
        original_recipe: recipe,
        modifications: modification,
      });
      if (response.status !== 200) throw new Error('Update failed');
      setRecipe(response.data.recipe);
      setModification('');
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError('There was an error updating the recipe.');
    }
    setUpdateLoading(false);
  };

  return (
    <div className="App">
      <h1>Recipe Detail</h1>
      <Link to="/" className="link-button">Back to Home</Link>
      {loading ? (
        <p>Loading recipe...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="recipe">
          <p>
            {new Date(timestamp).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <ReactMarkdown>{recipe}</ReactMarkdown>
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
          <div className="recipe-actions">
            <button onClick={handleDelete} className="link-button" style={{ marginTop: '1rem' }}>
              Delete Recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
