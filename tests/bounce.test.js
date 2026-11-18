// tests/bounce.test.js
// Lesson 6 physics: the bounce ledger is constant to 0.1% at every step, each
// bounce returns `keep` of the height, a clay ball does not bounce.
import { describe, it, expect } from 'vitest';
import { createBounceModel, BALLS } from '../src/physics/models/bounce.js';
import { ledgerBalances } from '../src/physics/equations.js';

describe('bounce model', () => {
  for (const ball of Object.keys(BALLS)) {
    it(`keeps the ledger constant to 0.1% at every step (${ball})`, () => {
      const m = createBounceModel({ ball, height: 1.0 });
      for (let i = 0; i < 4000; i++) {
        m.step(1 / 600);
        const v = m.values();
        expect(ledgerBalances(m.total, { g: v.gravitational, k: v.kinetic, e: v.elastic, i: v.internal })).toBe(true);
      }
    });
  }
  it('a tennis ball dropped from 1.0 m rises to 0.55 m', () => {
    const m = createBounceModel({ ball: 'tennis', height: 1.0 });
    let peak = 0;
    let rising = false;
    for (let i = 0; i < 3000; i++) {
      m.step(1 / 1000);
      const v = m.values();
      if (v.phase === 'rise') rising = true;
      if (rising && v.phase === 'rise') peak = Math.max(peak, v.y);
      if (rising && v.phase === 'fall') break;
    }
    expect(peak).toBeCloseTo(0.55, 3);
  });
  it('fills the elastic potential store during the squash', () => {
    const m = createBounceModel({ ball: 'superball', height: 1.0 });
    let maxElastic = 0;
    for (let i = 0; i < 2000; i++) {
      m.step(1 / 2000);
      maxElastic = Math.max(maxElastic, m.values().elastic);
    }
    expect(maxElastic).toBeGreaterThan(0.5 * m.total);
  });
  it('a clay ball stops on the first impact, with all energy in the internal store', () => {
    const m = createBounceModel({ ball: 'clay', height: 1.0 });
    for (let i = 0; i < 100; i++) m.step(0.01);
    const v = m.values();
    expect(v.stopped).toBe(true);
    expect(v.internal).toBeCloseTo(m.total, 9);
  });
});
