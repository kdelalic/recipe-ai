function RecipeView({ recipe }) {
  if (!recipe) return null;

  // Check if ingredients are in the new grouped format
  const hasGroupedIngredients =
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    typeof recipe.ingredients[0] === 'object' &&
    recipe.ingredients[0].group_name;

  return (
    <div className="recipe-view">
      <h1 dangerouslySetInnerHTML={{ __html: recipe.title }} />

      <p className="recipe-description" dangerouslySetInnerHTML={{ __html: recipe.description }} />

      {/* Recipe metadata */}
      {(recipe.prep_time || recipe.cook_time || recipe.servings) && (
        <div className="recipe-meta">
          {recipe.prep_time && <span className="meta-item">Prep: {recipe.prep_time}</span>}
          {recipe.cook_time && <span className="meta-item">Cook: {recipe.cook_time}</span>}
          {recipe.servings && <span className="meta-item">Serves: {recipe.servings}</span>}
        </div>
      )}

      <h2>Ingredients</h2>
      {hasGroupedIngredients ? (
        <div className="ingredient-groups">
          {recipe.ingredients.map((group, groupIdx) => (
            <div key={groupIdx} className="ingredient-group">
              <h3 className="ingredient-group-title">{group.group_name}</h3>
              <ul>
                {group.items.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul>
          {recipe.ingredients.map((ingredientHtml, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: ingredientHtml }} />
          ))}
        </ul>
      )}

      <h2>Instructions</h2>
      <ol className="instructions-list">
        {recipe.instructions.map((instructionHtml, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: instructionHtml }} />
        ))}
      </ol>

      {recipe.notes && recipe.notes.length > 0 && (
        <>
          <h2>Notes</h2>
          <ul className="notes-list">
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