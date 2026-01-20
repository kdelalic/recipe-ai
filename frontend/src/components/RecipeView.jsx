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

      {/* Recipe stats: time, servings, and macros */}
      {(recipe.prep_time || recipe.cook_time || recipe.servings || recipe.macros) && (
        <div className="recipe-stats">
          {recipe.prep_time && (
            <span className="stat-item">
              <span className="stat-label">Prep</span>
              <span className="stat-value">{recipe.prep_time}</span>
            </span>
          )}
          {recipe.cook_time && (
            <span className="stat-item">
              <span className="stat-label">Cook</span>
              <span className="stat-value">{recipe.cook_time}</span>
            </span>
          )}
          {recipe.servings && (
            <span className="stat-item">
              <span className="stat-label">Servings</span>
              <span className="stat-value">{recipe.servings}</span>
            </span>
          )}
          {recipe.macros && (
            <>
              <span className="stat-divider">|</span>
              <span className="macros-row">
                <span className="stat-item">
                  <span className="stat-value">{recipe.macros.calories}</span>
                  <span className="stat-label">cal</span>
                </span>
                <span className="stat-item">
                  <span className="stat-value">{recipe.macros.protein}g</span>
                  <span className="stat-label">protein</span>
                </span>
                <span className="stat-item">
                  <span className="stat-value">{recipe.macros.carbs}g</span>
                  <span className="stat-label">carbs</span>
                </span>
                <span className="stat-item">
                  <span className="stat-value">{recipe.macros.fat}g</span>
                  <span className="stat-label">fat</span>
                </span>
              </span>
            </>
          )}
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