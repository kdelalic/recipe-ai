import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
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
  const [error, setError] = useState('');
  const enableImageGeneration = import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true';
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

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
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
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
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeText }),
      });
      if (!response.ok) throw new Error('Image generation failed');
      const data = await response.json();
      setImageUrl(data.image_url);
    } catch (err) {
      console.error('Error generating image:', err);
      setError('There was an error generating the image.');
    }
    setImageLoading(false);
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
        </div>
      )}
      {history.length > 0 && (
        <div className="history">
          <h2>Recipe History:</h2>
          <div className="history-buttons">
            {history.map((item, index) => (
                <Link
                key={index}
                to={`/recipe/${item.id}`}
                className="link-button"
                >
                {item.title}
                </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
