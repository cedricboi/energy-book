// src/ui/marking.js
// Marking for every question type. Pure functions, so every check question's
// marking can be unit-tested (CLAUDE.md section 5, rule 8).
//
// Feedback responds to the actual mistake (section 6, rule 11): numeric
// questions list known wrong values (for example the value you get by
// forgetting to square v) with their own feedback.
//
// Every result is { correct: boolean, feedback: string, detail?: object }.

/** True if `value` matches `target` within a relative tolerance (default 2%). */
export function close(value, target, rel = 0.02) {
  if (!Number.isFinite(value)) return false;
  if (target === 0) return Math.abs(value) < 1e-9;
  return Math.abs(value - target) / Math.abs(target) <= rel;
}

/** Read a number typed by a student: allows spaces as thousands separators and a comma decimal. */
export function parseNumber(text) {
  if (typeof text === 'number') return text;
  if (typeof text !== 'string') return NaN;
  const cleaned = text.trim().replace(/\s+/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return NaN;
  return Number(cleaned);
}

/**
 * Multiple choice. q.options: [{ id, text, correct?, feedback }]
 * Each option carries its own feedback, so a wrong choice gets a reason.
 */
export function markMcq(q, choiceId) {
  const opt = q.options.find((o) => o.id === choiceId);
  if (!opt) return { correct: false, feedback: 'Choose one of the answers first.' };
  return { correct: !!opt.correct, feedback: opt.feedback ?? '' };
}

/** MCQ with a written reason. The reason must not be empty and must be a sentence of some length. */
export function markMcqReason(q, choiceId, reason) {
  const words = (reason ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < (q.minReasonWords ?? 4)) {
    return { correct: false, needsReason: true, feedback: 'Write your reason in a full sentence before you check.' };
  }
  return markMcq(q, choiceId);
}

/**
 * Numeric answer with a unit.
 * q.answer: number, q.unit: string, q.units: allowed unit choices,
 * q.tolerance: relative (default 0.02),
 * q.mistakes: [{ value, feedback }] known wrong answers,
 * q.correctFeedback, q.wrongFeedback
 */
export function markNumeric(q, typed, unit) {
  const value = parseNumber(typed);
  if (!Number.isFinite(value)) return { correct: false, feedback: 'Type your answer as a number, for example 12 or 3.5.' };
  const tol = q.tolerance ?? 0.02;
  const unitRight = !q.unit || unit === q.unit;
  if (close(value, q.answer, tol)) {
    if (!unitRight) return { correct: false, feedback: `Your number is right, but the unit is not. The answer is in ${q.unit}.`, detail: { unitWrong: true } };
    return { correct: true, feedback: q.correctFeedback ?? 'That is right.' };
  }
  for (const m of q.mistakes ?? []) {
    if (close(value, m.value, m.tolerance ?? tol)) return { correct: false, feedback: m.feedback, detail: { mistake: m.id ?? m.value } };
  }
  return { correct: false, feedback: q.wrongFeedback ?? 'That is not right. Check each step of your working.' };
}

/**
 * Short written answer. It cannot be marked like a number, so it is checked
 * for the key ideas. q.keyIdeas: [{ any: ['word', 'phrase'], hint }]
 * Every idea found counts. The model answer is shown after the student commits.
 */
export function markShort(q, text) {
  const t = ` ${(text ?? '').toLowerCase().replace(/[^a-z0-9.%\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const words = t.trim().split(' ').filter(Boolean);
  if (words.length < (q.minWords ?? 6)) return { correct: false, feedback: 'Write your answer in at least one full sentence.', detail: { tooShort: true } };
  const missing = [];
  for (const idea of q.keyIdeas ?? []) {
    const found = idea.any.some((w) => t.includes(` ${w.toLowerCase()}`));
    if (!found) missing.push(idea);
  }
  if (missing.length === 0) return { correct: true, feedback: q.correctFeedback ?? 'Your answer has all the key ideas. Compare it with the model answer.' };
  return {
    correct: false,
    feedback: missing.map((m) => m.hint).join(' '),
    detail: { missing: missing.length },
  };
}

/**
 * Fill the blanks. q.blanks: [{ id, answer, accept?: [] }]. answers: { id: text }
 */
export function markCloze(q, answers) {
  const wrong = [];
  for (const b of q.blanks) {
    const given = String(answers?.[b.id] ?? '').trim().toLowerCase();
    const ok = [b.answer, ...(b.accept ?? [])].some((a) => a.toLowerCase() === given);
    if (!ok) wrong.push(b);
  }
  if (wrong.length === 0) return { correct: true, feedback: q.correctFeedback ?? 'Every blank is right.' };
  return {
    correct: false,
    feedback: wrong.map((b) => b.hint).filter(Boolean).join(' ') || `${wrong.length} of the blanks are not right yet.`,
    detail: { wrong: wrong.map((b) => b.id) },
  };
}

/** Matching or labelling. q.pairs: [{ id, answer }]. answers: { id: chosen } */
export function markMatch(q, answers) {
  const wrong = q.pairs.filter((p) => answers?.[p.id] !== p.answer);
  if (wrong.length === 0) return { correct: true, feedback: q.correctFeedback ?? 'Every label is in the right place.' };
  return {
    correct: false,
    feedback: wrong.map((p) => p.hint).filter(Boolean).join(' ') || `${wrong.length} of ${q.pairs.length} are not in the right place yet.`,
    detail: { wrong: wrong.map((p) => p.id) },
  };
}

/** Ordering. q.order: correct array of ids. given: array of ids */
export function markOrder(q, given) {
  const ok = Array.isArray(given) && given.length === q.order.length && given.every((id, i) => id === q.order[i]);
  if (ok) return { correct: true, feedback: q.correctFeedback ?? 'That order is right.' };
  const firstWrong = (given ?? []).findIndex((id, i) => id !== q.order[i]);
  return { correct: false, feedback: q.wrongFeedback ?? `Step ${firstWrong + 1} is not in the right place yet.`, detail: { firstWrong } };
}

/** Mark any question by its type. */
export function mark(q, response) {
  switch (q.type) {
    case 'mcq': return markMcq(q, response?.choice);
    case 'mcqReason': return markMcqReason(q, response?.choice, response?.reason);
    case 'numeric': return markNumeric(q, response?.value, response?.unit);
    case 'short': return markShort(q, response?.text);
    case 'cloze': return markCloze(q, response?.answers);
    case 'match':
    case 'label': return markMatch(q, response?.answers);
    case 'order': return markOrder(q, response?.order);
    default: throw new Error(`Unknown question type "${q.type}"`);
  }
}
