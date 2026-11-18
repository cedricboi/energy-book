// src/ui/progress.js
// Saves each student's place and answers in localStorage, wrapped in
// try/catch: in a private window or with storage blocked, the book still
// works and simply does not remember.
const KEY = 'energy-ledger:progress:v1';

function readAll() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}
function writeAll(data) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // Not saved. Nothing else to do.
  }
}

export function loadLesson(id) {
  const all = readAll();
  return all[id] ?? { page: 0, answers: {}, named: [] };
}

export function saveLesson(id, state) {
  const all = readAll();
  all[id] = state;
  writeAll(all);
}

/** Terms named in any lesson so far (for the glossary). */
export function allNamedTerms() {
  const all = readAll();
  return [...new Set(Object.values(all).flatMap((l) => l.named ?? []))];
}

export function clearAll() {
  writeAll({});
}
