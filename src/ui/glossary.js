// src/ui/glossary.js
// Terms appear in the glossary only once they have been named in the book
// (CLAUDE.md section 6, rule 6: experience it, name it, use it, explain it).
import { GLOSSARY } from '../lessons/glossaryTerms.js';

export function glossaryEntries(namedIds) {
  return namedIds
    .map((id) => ({ id, ...GLOSSARY[id] }))
    .filter((e) => e.term)
    .sort((a, b) => a.term.localeCompare(b.term));
}

export function renderGlossary(container, namedIds) {
  const entries = glossaryEntries(namedIds);
  container.innerHTML = entries.length
    ? `<dl class="glossary">${entries.map((e) => `<dt>${e.term}</dt><dd>${e.meaning}</dd>`).join('')}</dl>`
    : '<p>Terms appear here once the book has named them.</p>';
}
