import { useState, useEffect } from 'react';
import { FaStar, FaRegStar, FaPrint, FaShareAlt } from 'react-icons/fa';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from './ThemeProvider';

function RecipeView({ recipe, author, timestamp, isFavorite, onToggleFavorite, recipeId, isMobile, sidebarCollapsed, onToggleSidebar, wakeLockEnabled, onToggleWakeLock, shareUrl, imageUrl, imageLoading }) {
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const { darkMode } = useTheme();
  const skeletonBaseColor = (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--skeleton-base').trim() : '') || (darkMode ? '#1e293b' : '#e5e7eb');
  const skeletonHighlightColor = (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--skeleton-highlight').trim() : '') || (darkMode ? '#334155' : '#f3f4f6');

  useEffect(() => {
    if (recipe?.title) {
      const plainTitle = recipe.title.replace(/<[^>]*>/g, '');
      document.title = plainTitle;
    }
  }, [recipe?.title]);

  if (!recipe) return null;

  // Check if ingredients are in the new grouped format
  const hasGroupedIngredients =
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    typeof recipe.ingredients[0] === 'object' &&
    recipe.ingredients[0].group_name;

  const toggleIngredient = (id) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderIngredient = (ingredientHtml, idx, groupIdx = null) => {
    const id = groupIdx !== null ? `${groupIdx}-${idx}` : `${idx}`;
    const isChecked = checkedIngredients.has(id);

    return (
      <li key={idx} className="ingredient-item">
        <input
          type="checkbox"
          className="ingredient-checkbox"
          checked={isChecked}
          onChange={() => toggleIngredient(id)}
          aria-label="Mark ingredient as used"
        />
        <span
          className={`ingredient-text ${isChecked ? 'checked' : ''}`}
          dangerouslySetInnerHTML={{ __html: ingredientHtml }}
        />
      </li>
    );
  };

  return (
    <div className="recipe-view">
      {isMobile && (
        <div className="recipe-mobile-header">
          <div className="recipe-action-buttons">
            {onToggleFavorite && (
              <button
                className={`recipe-action-btn ${isFavorite ? 'is-favorite' : ''}`}
                onClick={(e) => onToggleFavorite(recipeId, recipe.title, e)}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                data-tooltip-id="tooltip"
                data-tooltip-content={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? <FaStar size={14} /> : <FaRegStar size={14} />}
              </button>
            )}
            {onToggleWakeLock && (
              <button
                className={`recipe-action-btn ${wakeLockEnabled ? 'is-active' : ''}`}
                onClick={onToggleWakeLock}
                aria-label={wakeLockEnabled ? 'Disable keep screen awake' : 'Keep screen awake'}
                data-tooltip-id="tooltip"
                data-tooltip-content={wakeLockEnabled ? 'Screen will stay awake' : 'Keep screen awake'}
              >
                {wakeLockEnabled ? <HiOutlineEye size={14} /> : <HiOutlineEyeOff size={14} />}
              </button>
            )}
            <button
              className="recipe-action-btn"
              onClick={() => window.print()}
              aria-label="Print recipe"
              data-tooltip-id="tooltip"
              data-tooltip-content="Print recipe"
            >
              <FaPrint size={14} />
            </button>
            <button
              className="recipe-action-btn"
              onClick={() => {
                const url = shareUrl || window.location.href;
                if (navigator.share) {
                  navigator.share({
                    title: recipe.title?.replace(/<[^>]*>/g, '') || 'Recipe',
                    url,
                  });
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              aria-label="Share recipe"
              data-tooltip-id="tooltip"
              data-tooltip-content="Share recipe"
            >
              <FaShareAlt size={14} />
            </button>
          </div>
        </div>
      )}

      <h1 dangerouslySetInnerHTML={{ __html: recipe.title }} />
      {author && (
        <p className="recipe-byline">
          {author}
          {timestamp && (
            <span className="recipe-date">
              {' '}· {new Date(timestamp).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
        </p>
      )}

      {!isMobile && (
        <div className="recipe-action-buttons">
          {onToggleFavorite && (
            <button
              className={`recipe-action-btn ${isFavorite ? 'is-favorite' : ''}`}
              onClick={(e) => onToggleFavorite(recipeId, recipe.title, e)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-tooltip-id="tooltip"
              data-tooltip-content={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? <FaStar size={14} /> : <FaRegStar size={14} />}
            </button>
          )}
          {onToggleWakeLock && (
            <button
              className={`recipe-action-btn ${wakeLockEnabled ? 'is-active' : ''}`}
              onClick={onToggleWakeLock}
              aria-label={wakeLockEnabled ? 'Disable keep screen awake' : 'Keep screen awake'}
              data-tooltip-id="tooltip"
              data-tooltip-content={wakeLockEnabled ? 'Screen will stay awake' : 'Keep screen awake'}
            >
              {wakeLockEnabled ? <HiOutlineEye size={14} /> : <HiOutlineEyeOff size={14} />}
            </button>
          )}
          <button
            className="recipe-action-btn"
            onClick={() => window.print()}
            aria-label="Print recipe"
            data-tooltip-id="tooltip"
            data-tooltip-content="Print recipe"
          >
            <FaPrint size={14} />
          </button>
          <button
            className="recipe-action-btn"
            onClick={() => {
              const url = shareUrl || window.location.href;
              if (navigator.share) {
                navigator.share({
                  title: recipe.title?.replace(/<[^>]*>/g, '') || 'Recipe',
                  url,
                });
              } else {
                navigator.clipboard.writeText(url);
              }
            }}
            aria-label="Share recipe"
            data-tooltip-id="tooltip"
            data-tooltip-content="Share recipe"
          >
            <FaShareAlt size={14} />
          </button>
        </div>
      )}

      {(imageUrl || imageLoading) && (
        <div className="recipe-image">
          {imageLoading ? (
            <SkeletonTheme baseColor={skeletonBaseColor} highlightColor={skeletonHighlightColor}>
              <Skeleton width="100%" className="recipe-image-skeleton" borderRadius={8} />
            </SkeletonTheme>
          ) : (
            <img src={imageUrl} alt={recipe.title?.replace(/<[^>]*>/g, '') || 'Recipe'} />
          )}
        </div>
      )}

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
                {group.items.map((item, idx) => renderIngredient(item, idx, groupIdx))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul>
          {recipe.ingredients.map((ingredientHtml, idx) => renderIngredient(ingredientHtml, idx))}
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