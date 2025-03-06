// diffHelper.js
import { diffWords } from 'diff';

// For a single string field, return an HTML string.
function diffFieldAsHtml(oldStr, newStr) {
  const oldText = oldStr || '';
  const newText = newStr || '';

  const parts = diffWords(oldText, newText);

  return parts
    .map(part => {
      if (part.added) {
        return `<span class="diff-added">${part.value}</span>`;
      } else if (!part.removed) {
        return part.value;
      }
    })
    .join('');
}

/**
 * Compare two "recipe" objects and return a new object
 * whose fields are HTML strings with <span> tags around changes.
 */
export function computeRecipeDiffAsHtml(oldRecipe, newRecipe) {
  if (!oldRecipe || !newRecipe) return newRecipe;

  // For array fields, diff each element individually and
  // join them with line breaks or bullets, etc.
  const diffArrayAsHtml = (oldArr = [], newArr = []) => {
    const length = Math.max(oldArr.length, newArr.length);
    const results = [];
    for (let i = 0; i < length; i++) {
      const oldItem = oldArr[i] || '';
      const newItem = newArr[i] || '';
      results.push(diffFieldAsHtml(oldItem, newItem));
    }
    return results;
  };

  return {
    title: diffFieldAsHtml(oldRecipe.title, newRecipe.title),
    description: diffFieldAsHtml(oldRecipe.description, newRecipe.description),
    ingredients: diffArrayAsHtml(oldRecipe.ingredients, newRecipe.ingredients),
    instructions: diffArrayAsHtml(oldRecipe.instructions, newRecipe.instructions),
    notes: diffArrayAsHtml(oldRecipe.notes, newRecipe.notes),
  };
}
