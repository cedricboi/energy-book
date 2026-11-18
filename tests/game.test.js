// tests/game.test.js
// Ledger Run: every level can be won by correct energy accounting, and none
// can be won by a random setting (each single try has under a 10% chance).
import { describe, it, expect } from 'vitest';
import { LEVELS, evaluate, solve, score, targetEnergy, MARBLE } from '../src/physics/game.js';
import { gravitationalPotentialEnergy, heightFromGravitationalPotentialEnergy } from '../src/physics/equations.js';

describe('Ledger Run', () => {
  it('has eight levels, getting harder (more inputs) towards the end', () => {
    expect(LEVELS.length).toBe(8);
    expect(Object.keys(LEVELS[7].inputs).length).toBe(4);
  });

  it('level 1 is solved from the physics alone', () => {
    const L = LEVELS[0];
    // Accounts: the start must supply what the cup needs plus the ramp's loss.
    const need = gravitationalPotentialEnergy(MARBLE, L.target.height) + L.fixedLoss[0].joules;
    const h = heightFromGravitationalPotentialEnergy(need, MARBLE);
    expect(h).toBeCloseTo(0.45, 9);
    expect(evaluate(L, { height: h }).result).toBe('win');
    expect(evaluate(L, { height: h - 0.05 }).result).toBe('stall');
    expect(evaluate(L, { height: h + 0.05 }).result).toBe('overshoot');
  });

  for (const L of LEVELS) {
    it(`level ${L.id} (${L.title}) can be won, and not by guessing`, () => {
      const { wins, least, chance } = solve(L);
      expect(wins.length).toBeGreaterThan(0);
      expect(least).toBeTruthy();
      expect(chance, `a random setting wins ${(chance * 100).toFixed(1)}% of the time`).toBeLessThan(0.1);
      // Every win delivers the target energy within the window.
      for (const w of wins) expect(w.atTarget - targetEnergy(L)).toBeGreaterThanOrEqual(-1e-9);
    });
  }

  it('scores 100, plus 50 for least input energy, plus a first-time streak, and no speed bonus', () => {
    const L = LEVELS[5];
    const { least, wins } = solve(L);
    const best = score(L, least.inputs, { firstTry: true, streak: 2 });
    expect(best.points).toBe(100 + 50 + 50);
    const other = wins.find((w) => w.totalIn > least.totalIn + 1e-9);
    expect(score(L, other.inputs, { firstTry: false, streak: 0 }).points).toBe(100);
    expect(score(L, { lift: 0, spring: 0 }, { firstTry: true, streak: 1 }).points).toBe(0);
  });
});
