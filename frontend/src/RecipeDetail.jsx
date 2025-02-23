import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import './Home.css';

function RecipeDetail() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipe/${id}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setRecipe(data.recipe);
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('There was an error fetching the recipe.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipe();
  }, [id]);

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
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
