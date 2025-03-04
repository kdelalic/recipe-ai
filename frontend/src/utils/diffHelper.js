import { diffWords } from 'diff';

export function computeInlineDiff(oldText, newText) {
  const diff = diffWords(oldText, newText);
  // Wrap added and removed parts in spans with CSS classes.
  const diffHtml = diff
    .map((part) => {
      if (part.added) {
        // Split added text on newline so newlines are not inside the span.
        return part.value
          .split('\n')
          .map(segment => segment ? `<span class="diff-added">${segment}</span>` : '')
          .join('\n');
      } else if (!part.removed) {
        return part.value;
      }
    })
    .join('');

  // Fix list markers: unwrap numbers or numbers with a dot that are wrapped in a span.
  const numericFixedHtml = diffHtml
    .replace(/<span class="diff-added">(\d+)<\/span>\.\s*/g, '$1. <span class="diff-added">')
    .replace(/<span class="diff-added">(\d+\.\s)/g, '$1<span class="diff-added">');

  return numericFixedHtml;
}
