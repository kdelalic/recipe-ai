// diffHelper.js
import { diffWords } from 'diff';

// For a single string field, return an HTML string
// that highlights added text with <span class="diff-added">
// and omits removed text (or you could include <span class="diff-removed"> for removal).
function diffFieldAsHtml(oldStr, newStr) {
  const oldText = oldStr || '';
  const newText = newStr || '';

  const parts = diffWords(oldText, newText);

  return parts
    .map(part => {
      if (part.added) {
        return `<span class="diff-added">${part.value}</span>`;
      } else if (part.removed) {
        // If you want to visibly show removed parts, you could do:
        // return `<span class="diff-removed">${part.value}</span>`;
        // But if you only highlight additions, just omit removed parts:
        return '';
      } else {
        return part.value; // unchanged text
      }
    })
    .join('');
}

/**
 * Compare two arrays of strings (e.g., ingredients or steps) with a simple
 * alignment approach. If a line is inserted or deleted, only that line is marked
 * as added/removed. Otherwise, we do a word-level diff for changed lines.
 *
 * Returns an array of HTML strings, each of which may contain <span class="diff-added">
 * or <span class="diff-removed"> parts.
 */
function diffArrayAsHtml(oldArr = [], newArr = []) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < oldArr.length && j < newArr.length) {
    if (oldArr[i] === newArr[j]) {
      // Lines match => unchanged
      result.push(oldArr[i]);
      i++;
      j++;
    } else if (j + 1 < newArr.length && oldArr[i] === newArr[j + 1]) {
      // newArr[j] was inserted
      result.push(`<span class="diff-added">${newArr[j]}</span>`);
      j++;
    } else if (i + 1 < oldArr.length && oldArr[i + 1] === newArr[j]) {
      // oldArr[i] was removed
      // If you want to visually show removed lines, do something like:
      // result.push(`<span class="diff-removed">${oldArr[i]}</span>`);
      // Otherwise, skip it. We'll assume we want to highlight removed text:
      i++;
    } else {
      // Lines differ => do a word-level diff of these two lines
      result.push(diffFieldAsHtml(oldArr[i], newArr[j]));
      i++;
      j++;
    }
  }

  // If oldArr has leftover lines => they were removed
  while (i < oldArr.length) {
    i++;
  }

  // If newArr has leftover lines => they were added
  while (j < newArr.length) {
    result.push(`<span class="diff-added">${newArr[j]}</span>`);
    j++;
  }

  return result;
}

/**
 * Compare two arrays of ingredient groups and return diffed ingredient groups.
 * Each group has { group_name, items } structure.
 */
function diffIngredientGroupsAsHtml(oldGroups = [], newGroups = []) {
  const result = [];

  // Create maps for easier lookup by group_name
  const oldGroupMap = new Map(oldGroups.map(g => [g.group_name, g.items || []]));

  for (const newGroup of newGroups) {
    const oldItems = oldGroupMap.get(newGroup.group_name) || [];
    const newItems = newGroup.items || [];

    result.push({
      group_name: oldGroupMap.has(newGroup.group_name)
        ? diffFieldAsHtml(newGroup.group_name, newGroup.group_name)
        : `<span class="diff-added">${newGroup.group_name}</span>`,
      items: diffArrayAsHtml(oldItems, newItems),
    });
  }

  return result;
}

/**
 * Compare two "recipe" objects and return a new object
 * whose fields are HTML strings (for single-valued fields)
 * or arrays of HTML strings (for list fields).
 *
 * Example output:
 * {
 *   title: "<span class='diff-added'>...</span>",
 *   description: "...",
 *   ingredients: [{ group_name: "...", items: ["...", ...] }, ...],
 *   instructions: [...],
 *   notes: [...]
 * }
 */
export function computeRecipeDiffAsHtml(oldRecipe, newRecipe) {
  if (!oldRecipe || !newRecipe) return newRecipe;

  return {
    ...newRecipe,
    // Single string fields => highlight word-level changes.
    title: diffFieldAsHtml(oldRecipe.title, newRecipe.title),
    description: diffFieldAsHtml(oldRecipe.description, newRecipe.description),

    // Ingredient groups => special handling for group structure
    ingredients: diffIngredientGroupsAsHtml(oldRecipe.ingredients, newRecipe.ingredients),

    // Array fields => align them, highlight insertions, deletions, or partial changes
    instructions: diffArrayAsHtml(oldRecipe.instructions, newRecipe.instructions),
    notes: diffArrayAsHtml(oldRecipe.notes || [], newRecipe.notes || []),
  };
}
