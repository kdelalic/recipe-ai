function RecipeView({ recipe }) {
    if (!recipe) return null; // guard
  
    return (
      <div>
        <h1 dangerouslySetInnerHTML={{ __html: recipe.title }} />
  
        {/* description */}
        <p dangerouslySetInnerHTML={{ __html: recipe.description }} />
  
        <h2>Ingredients</h2>
        <ul>
          {recipe.ingredients.map((ingredientHtml, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: ingredientHtml }} />
          ))}
        </ul>
  
        <h2>Instructions</h2>
        <ol>
          {recipe.instructions.map((instructionHtml, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: instructionHtml }} />
          ))}
        </ol>
  
        {recipe.notes && recipe.notes.length > 0 && (
          <>
            <h2>Notes</h2>
            <ul>
              {recipe.notes.map((noteHtml, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: noteHtml }} />
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

export default RecipeView;