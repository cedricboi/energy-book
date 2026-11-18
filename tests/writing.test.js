// tests/writing.test.js
// CLAUDE.md section 7: no semicolons, no em or en dashes, no colon-opened
// fragments ("Check:"), and no Singlish markers, in any student-facing text.
// Every string in every lesson module is scanned (except equations, ids and
// asset paths).
import { describe, it, expect } from 'vitest';
import { LESSONS } from '../src/lessons/index.js';
import { GLOSSARY } from '../src/lessons/glossaryTerms.js';

const SKIP_KEYS = new Set(['id', 'type', 'scene', 'photo', 'unit', 'units', 'answer', 'cue', 'term', 'syllabus', 'controls', 'actions', 'pathway', 'store']);

function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`);
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) yield* strings(v, path ? `${path}.${k}` : k);
  }
}

export function writingProblems(text) {
  const problems = [];
  const plain = text.replace(/<[^>]+>/g, '');
  if (plain.includes(';')) problems.push('semicolon');
  if (/[—–]/.test(plain)) problems.push('dash');
  // A colon-opened fragment: a short label followed by a colon, such as "Check:".
  if (/(^|[.!?]\s+)[A-Z][a-z]+( [a-z]+)?:\s/.test(plain)) problems.push('colon fragment');
  if (/\b(lah|leh|lor|meh|sia)\b/i.test(plain)) problems.push('Singlish marker');
  return problems;
}

describe('writing rules', () => {
  it('the checker catches each kind of problem', () => {
    expect(writingProblems('Remember: square v.')).toContain('colon fragment');
    expect(writingProblems('It falls; it speeds up.')).toContain('semicolon');
    expect(writingProblems('The ball — fast.')).toContain('dash');
    expect(writingProblems('Ek = ½mv² where v is the speed.')).toEqual([]);
  });

  it('glossary text follows the rules', () => {
    for (const [id, g] of Object.entries(GLOSSARY)) {
      for (const [, s] of strings(g)) expect(writingProblems(s), `${id}: ${s}`).toEqual([]);
    }
  });

  for (const entry of LESSONS) {
    it(`${entry.id} follows the rules`, async () => {
      const lesson = (await entry.load()).default;
      if (!lesson?.pages) return; // not written yet
      const bad = [];
      for (const [path, s] of strings(lesson)) {
        const p = writingProblems(s);
        if (p.length) bad.push(`${path}: ${p.join(', ')}: "${s.slice(0, 80)}"`);
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }
});
