import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState('');
  const [history, setHistory] = useState([]); // Array of { title, recipe }
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  // Feature flag to enable image generation
  const enableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';

  // Function to load history from Firestore via the backend endpoint
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/recipe-history');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('There was an error fetching the recipe history.');
    }
  };

  // Load history when component mounts
  useEffect(() => {
    fetchHistory();
  }, []);

  // Extracts the title from the recipe (assumes the first Markdown header)
  function extractTitle(recipeText) {
    const match = recipeText.match(/^# (.*)/m);
    return match ? match[1].trim() : 'Recipe';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentRecipe('');
    setImageUrl('');

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      const recipeText = data.recipe;
      const title = extractTitle(recipeText);
      setCurrentRecipe(recipeText);
      // Prepend new recipe to history as an object with title and full recipe
      setHistory((prevHistory) => [{ title, recipe: recipeText }, ...prevHistory]);

      // Only generate an image if the feature flag is enabled
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
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeText }),
      });
      if (!response.ok) {
        throw new Error('Image generation failed');
      }
      const data = await response.json();
      setImageUrl(data.image_url);
    } catch (err) {
      console.error('Error generating image:', err);
      setError('There was an error generating the image.');
    }
    setImageLoading(false);
  };

  const handleHistoryClick = (recipe) => {
    setCurrentRecipe(recipe);
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

      {error && <p className="error">{error}</p>}

      {currentRecipe && (
        <div className="recipe">
          {enableImageGeneration && (
            <>
              {imageLoading ? (
                <p>Generating image...</p>
              ) : imageUrl ? (
                <div className="image-preview">
                  <h3>Dish Preview:</h3>
                  <img src={imageUrl} alt="Dish Preview" />
                </div>
              ) : null}
            </>
          )}
          <ReactMarkdown>{currentRecipe}</ReactMarkdown>
        </div>
      )}

      {history.length > 0 && (
        <div className="history">
          <h2>Recipe History:</h2>
          <div className="history-buttons">
            {history.map((item, index) => (
              <button
                key={index}
                className="history-button"
                onClick={() => handleHistoryClick(item.recipe)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
