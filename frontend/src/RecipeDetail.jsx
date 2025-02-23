import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from './api';
import './Home.css';

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecipe = async () => {
    try {
      const response = await api.get(`/api/recipe/${id}`);
      if (response.status !== 200) throw new Error('Network response was not ok');
      setRecipe(response.data.recipe);
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
    try {
      const response = await api.delete(`/api/recipe/${id}`);
      if (response.status !== 200) throw new Error('Failed to delete recipe');
      // After deletion, navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError('There was an error deleting the recipe.');
    }
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
          <ReactMarkdown>{recipe}</ReactMarkdown>
          <button onClick={handleDelete} className="link-button" style={{ marginTop: '1rem' }}>
            Delete Recipe
          </button>
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
