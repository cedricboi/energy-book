// tests/lessons.test.js
// Every check question in every lesson (CLAUDE.md section 5, rule 8):
// stable unique ids, the right answer marks right, every known mistake gets
// its own feedback, MCQ options are parallel (section 6, rule 17), cloze
// answers are in the word bank, and every page type is known.
import { describe, it, expect } from 'vitest';
import { LESSONS } from '../src/lessons/index.js';
import { mark, close } from '../src/ui/marking.js';

const PAGE_TYPES = new Set(['hook', 'predict', 'explore', 'name', 'use', 'check', 'notes', 'exit', 'text']);

function questionsOf(lesson) {
  const out = [];
  for (const p of lesson.pages) {
    if (p.question) out.push({ q: p.question, page: p });
    for (const q of p.questions ?? []) out.push({ q, page: p });
  }
  return out;
}

const parallelWord = (texts, word) => {
  const has = texts.map((t) => new RegExp(`\b${word}\b`, 'i').test(t));
  return has.every(Boolean) || !has.some(Boolean);
};

for (const entry of LESSONS) {
  describe(entry.id, async () => {
    const lesson = (await entry.load()).default;
    if (!lesson?.pages) {
      it.skip('not written yet', () => {});
      return;
    }
    it('uses only known page types, and opens with today\'s questions', () => {
      for (const p of lesson.pages) expect(PAGE_TYPES.has(p.type), p.type).toBe(true);
      if (!lesson.hidden) {
        expect(lesson.questions?.length).toBeGreaterThan(0);
        expect(lesson.pages[0].type).toBe('hook');
        expect(lesson.pages.at(-1).type).toBe('exit');
        expect(lesson.pages.some((p) => p.type === 'explore'), 'explore is always part of a lesson').toBe(true);
        expect(lesson.pages.some((p) => p.type === 'notes'), 'each lesson ends with a notes page').toBe(true);
      }
    });
    const qs = questionsOf(lesson);
    it('gives every question a stable, unique id', () => {
      const ids = qs.map(({ q }) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^l\d+-[a-z]+\d+$/);
    });
    for (const { q, page } of qs) {
      it(`${q.id} (${q.type ?? page.type}) marks correctly`, () => {
        if (page.type === 'predict') {
          const texts = q.options.map((o) => o.text);
          expect(parallelWord(texts, 'because')).toBe(true);
          return;
        }
        if (q.type === 'numeric') {
          expect(mark(q, { value: String(q.answer), unit: q.unit }).correct).toBe(true);
          for (const m of q.mistakes ?? []) {
            expect(close(m.value, q.answer, q.tolerance ?? 0.02), `${q.id}: mistake ${m.id} is within tolerance of the answer`).toBe(false);
            const r = mark(q, { value: String(m.value), unit: q.unit });
            expect(r.correct).toBe(false);
            expect(r.feedback).toBe(m.feedback);
          }
          expect(q.units ?? [q.unit]).toContain(q.unit);
        } else if (q.type === 'mcq' || q.type === 'mcqReason') {
          expect(q.options.filter((o) => o.correct).length).toBe(1);
          for (const o of q.options) expect(o.feedback, `${q.id}/${o.id} needs its own feedback`).toBeTruthy();
          const texts = q.options.map((o) => o.text);
          for (const w of ['because', 'so']) expect(parallelWord(texts, w), `${q.id}: options must be parallel ("${w}")`).toBe(true);
          const right = q.options.find((o) => o.correct);
          expect(mark(q, { choice: right.id, reason: 'a full reason sentence here' }).correct).toBe(true);
        } else if (q.type === 'cloze') {
          const bank = q.bank ?? q.blanks.map((b) => b.answer);
          for (const b of q.blanks) expect(bank, `${q.id}: ${b.answer} must be in the bank`).toContain(b.answer);
          expect(mark(q, { answers: Object.fromEntries(q.blanks.map((b) => [b.id, b.answer])) }).correct).toBe(true);
        } else if (q.type === 'match' || q.type === 'label') {
          expect(mark(q, { answers: Object.fromEntries(q.pairs.map((p) => [p.id, p.answer])) }).correct).toBe(true);
        } else if (q.type === 'order') {
          expect(mark(q, { order: q.order }).correct).toBe(true);
        } else if (q.type === 'short') {
          expect(q.model, `${q.id} needs a model answer`).toBeTruthy();
          expect(mark(q, { text: q.model }).correct, `${q.id}: the model answer must contain every key idea`).toBe(true);
        }
      });
    }
  });
}
