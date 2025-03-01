import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import api from './api';
import './Home.css';

function extractTitle(recipeText) {
  const match = recipeText.match(/^# (.*)/m);
  return match ? match[1].trim() : 'Recipe';
}

function Home() {
  const [input, setInput] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [history, setHistory] = useState([]); // Array of { id, title, recipe }
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const enableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [modification, setModification] = useState('');

  const fetchHistory = async () => {
    try {
      const response = await api.get('/api/recipe-history');
      if (response.status !== 200) {
        throw new Error('Network response was not ok');
      }
      const data = await response.data;
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('There was an error fetching the recipe history.');
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentRecipe('');
    setImageUrl('');

    try {
      const response = await api.post('/api/generate-recipe', { prompt: input });
      if (response.status !== 200) throw new Error('Network response was not ok');
      const data = await response.data;
      const recipeText = data.recipe;
      const title = extractTitle(recipeText);
      setCurrentRecipe(recipeText);
      setHistory((prevHistory) => [{ id: data.id, title, recipe: recipeText }, ...prevHistory]);
      if (enableImageGeneration) {
        handleGenerateImage(recipeText);
      }
    } catch (err) {
      console.error('Error generating recipe:', err);
      setError('There was an error generating the recipe.');
    }
    setLoading(false);
  };

  const handleGenerateImage = async (recipeText) => {
    setImageLoading(true);
    try {
      const response = await api.post('/api/generate-image', { recipe: recipeText });
      if (response.status !== 200) throw new Error('Image generation failed');
      const data = await response.data;
      setImageUrl(data.image_url);
    } catch (err) {
      console.error('Error generating image:', err);
      setError('There was an error generating the image.');
    }
    setImageLoading(false);
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
      <h1>AI Recipe Generator</h1>
      <form onSubmit={handleSubmit}>
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
      {currentRecipe && (
        <div className="recipe">
          <ReactMarkdown>{currentRecipe}</ReactMarkdown>
          {enableImageGeneration && (
            <>
              {imageLoading ? (
                <p>Generating image...</p>
              ) : imageUrl ? (
                <div className="image-preview">
                  <img src={imageUrl} alt="Dish Preview" />
                </div>
              ) : null}
            </>
          )}
          <div className="modification-section">
            <input
              type="text"
              placeholder="Enter modifications (e.g., remove pork belly)"
              value={modification}
              onChange={(e) => setModification(e.target.value)}
            />
            <button type="submit" onClick={handleUpdateRecipe} disabled={loading || !modification}>
              Update Recipe
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p className="error">{error}</p>
      ) : historyLoading ? (
        <p>Loading history...</p>
      ) : (
        <div className="history">
          <h2>Recipe History</h2>
          {history.length > 0 ? (
            <div className="history-buttons">
              {history.map((item, index) => (
                <Link key={index} to={`/recipe/${item.id}`} className="link-button">
                  {item.title}
                </Link>
              ))}
            </div>
          ) : (
            <p>No recipes generated yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
