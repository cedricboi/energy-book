// tests/marking.test.js
// The marking engine. Each lesson adds tests for its own questions.
import { describe, it, expect } from 'vitest';
import { close, parseNumber, mark } from '../src/ui/marking.js';

describe('numbers typed by students', () => {
  it('reads plain, spaced and comma forms', () => {
    expect(parseNumber('12')).toBe(12);
    expect(parseNumber(' 3.5 ')).toBe(3.5);
    expect(parseNumber('30 000')).toBe(30000);
    expect(parseNumber('1,800')).toBe(1800);
    expect(parseNumber('2,5')).toBe(2.5);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });
  it('compares within 2%', () => {
    expect(close(7.75, 7.746)).toBe(true);
    expect(close(7.5, 7.746)).toBe(false);
  });
});

describe('question types', () => {
  const numeric = {
    type: 'numeric', answer: 45, unit: 'J', units: ['J', 'N', 'W'],
    mistakes: [{ id: 'no-square', value: 15, feedback: 'You did not square the speed. Square v before you multiply.' }],
  };
  it('numeric: right, wrong unit, known mistake, other', () => {
    expect(mark(numeric, { value: '45', unit: 'J' }).correct).toBe(true);
    const u = mark(numeric, { value: '45', unit: 'W' });
    expect(u.correct).toBe(false);
    expect(u.detail.unitWrong).toBe(true);
    expect(mark(numeric, { value: '15', unit: 'J' }).feedback).toMatch(/square/);
    expect(mark(numeric, { value: '99', unit: 'J' }).correct).toBe(false);
    expect(mark(numeric, { value: 'x', unit: 'J' }).feedback).toMatch(/number/);
  });
  const mcq = { type: 'mcq', options: [{ id: 'a', text: 'A', correct: true, feedback: 'Yes.' }, { id: 'b', text: 'B', feedback: 'No, because.' }] };
  it('mcq gives each option its own feedback', () => {
    expect(mark(mcq, { choice: 'a' })).toEqual({ correct: true, feedback: 'Yes.' });
    expect(mark(mcq, { choice: 'b' }).feedback).toBe('No, because.');
    expect(mark(mcq, {}).correct).toBe(false);
  });
  it('mcqReason needs a reason first', () => {
    const q = { ...mcq, type: 'mcqReason' };
    expect(mark(q, { choice: 'a', reason: 'because' }).needsReason).toBe(true);
    expect(mark(q, { choice: 'a', reason: 'it starts at the same height so' }).correct).toBe(true);
  });
  it('short answers are checked for key ideas', () => {
    const q = { type: 'short', keyIdeas: [{ any: ['internal'], hint: 'Name the store the energy ends up in.' }, { any: ['friction'], hint: 'Say what causes it.' }] };
    expect(mark(q, { text: 'too short' }).detail.tooShort).toBe(true);
    expect(mark(q, { text: 'The energy goes into the internal store because of friction.' }).correct).toBe(true);
    expect(mark(q, { text: 'The energy goes somewhere else because of friction on the ramp.' }).feedback).toMatch(/store/);
  });
  it('cloze, match and order', () => {
    expect(mark({ type: 'cloze', blanks: [{ id: 'x', answer: 'kinetic' }] }, { answers: { x: ' Kinetic ' } }).correct).toBe(true);
    expect(mark({ type: 'match', pairs: [{ id: 'a', answer: '1' }, { id: 'b', answer: '2' }] }, { answers: { a: '1', b: '1' } }).correct).toBe(false);
    expect(mark({ type: 'order', order: ['a', 'b', 'c'] }, { order: ['a', 'b', 'c'] }).correct).toBe(true);
    expect(mark({ type: 'order', order: ['a', 'b', 'c'] }, { order: ['a', 'c', 'b'] }).detail.firstWrong).toBe(1);
  });
});
