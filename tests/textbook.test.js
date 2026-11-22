// tests/textbook.test.js
// Setting a lesson as a textbook must not add, drop or reorder anything.
import { describe, it, expect } from 'vitest';
import { LESSONS } from '../src/lessons/index.js';
import { toTextbook } from '../src/lessons/textbook.js';

const stepIds = (lesson) => lesson.pages.flatMap((p) => [p.question?.id, ...(p.questions ?? []).map((q) => q.id)]).filter(Boolean);
const spreadIds = (lesson) => lesson.pages.flatMap((p) => [...(p.left ?? []), ...(p.right ?? [])].flatMap((b) => [b.q?.id, b.predict?.id])).filter(Boolean);

for (const entry of LESSONS.filter((l) => !l.hidden)) {
  describe(`${entry.id} as a textbook`, async () => {
    const raw = (await entry.load()).default;
    const book = toTextbook(raw, entry.number);
    if (raw.game) {
      it('leaves the game as it is', () => expect(book).toBe(raw));
      return;
    }
    it('is made of spreads, and the last one earns the stamp', () => {
      expect(book.pages.every((p) => p.type === 'spread')).toBe(true);
      expect(book.pages.at(-1).completes).toBe(true);
      expect([...(book.pages.at(-1).left ?? []), ...(book.pages.at(-1).right ?? [])].some((b) => b.stamp)).toBe(true);
    });
    it('has fewer pages than steps', () => {
      if (!raw.textbook) expect(book.pages.length).toBeLessThan(raw.pages.length);
    });
    it('keeps every question, in order', () => {
      if (!raw.textbook) expect(spreadIds(book)).toEqual(stepIds(raw));
    });
    it('numbers the questions 1, 2, 3 and so on', () => {
      const ns = book.pages.flatMap((p) => [...(p.left ?? []), ...(p.right ?? [])].filter((b) => b.q).map((b) => b.n));
      expect(ns).toEqual(ns.map((_, i) => i + 1));
    });
    it('shows today\'s questions once, on the first spread', () => {
      const withQs = book.pages.map((p) => (p.left ?? []).filter((b) => b.questions).length);
      expect(withQs[0]).toBe(1);
      expect(withQs.slice(1).every((n) => n === 0)).toBe(true);
    });
    it('never mixes a hidden-numbers question with a spread students handle', () => {
      for (const p of book.pages) if (p.hideValues) expect((p.left ?? []).some((b) => b.try || b.predict)).toBe(false);
    });
  });
}
