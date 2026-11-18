// tests/physics.test.js
// Phase 1: every equation in src/physics/equations.js and every rule in
// src/physics/format.js. Later phases add each lesson model's energy ledger
// and each check question's marking (CLAUDE.md section 5, rule 8).
import { describe, it, expect } from 'vitest';
import { G, LEDGER_TOLERANCE } from '../src/physics/constants.js';
import * as eq from '../src/physics/equations.js';
import { roundSig, formatNumber, formatQuantity } from '../src/physics/format.js';

describe('constants', () => {
  it('uses g = 10 N/kg, as in the teacher\'s notes and exam papers', () => {
    expect(G).toBe(10);
  });
  it('sets the ledger tolerance to 0.1%', () => {
    expect(LEDGER_TOLERANCE).toBe(0.001);
  });
});

describe('5(b) kinetic energy, Ek = ½mv²', () => {
  it('computes known values', () => {
    expect(eq.kineticEnergy(2, 3)).toBe(9);
    expect(eq.kineticEnergy(0.5, 3)).toBeCloseTo(2.25, 12);
    expect(eq.kineticEnergy(1000, 20)).toBe(200000);
  });
  it('doubles when mass doubles', () => {
    expect(eq.kineticEnergy(0.4, 2)).toBeCloseTo(2 * eq.kineticEnergy(0.2, 2), 12);
  });
  it('becomes four times as large when speed doubles', () => {
    expect(eq.kineticEnergy(0.3, 3)).toBeCloseTo(4 * eq.kineticEnergy(0.3, 1.5), 12);
  });
  it('is zero at rest', () => {
    expect(eq.kineticEnergy(5, 0)).toBe(0);
  });
  it('rearranges for v and m', () => {
    expect(eq.speedFromKineticEnergy(9, 2)).toBeCloseTo(3, 12);
    expect(eq.massFromKineticEnergy(9, 3)).toBeCloseTo(2, 12);
  });
  it('round-trips', () => {
    const e = eq.kineticEnergy(0.35, 2.5);
    expect(eq.speedFromKineticEnergy(e, 0.35)).toBeCloseTo(2.5, 12);
    expect(eq.massFromKineticEnergy(e, 2.5)).toBeCloseTo(0.35, 12);
  });
  it('keeps the Lesson 3 slider range readable in one jar (smallest at least ~4% of largest)', () => {
    const smallest = eq.kineticEnergy(0.2, 1.0);
    const largest = eq.kineticEnergy(0.5, 3.0);
    expect(smallest).toBeCloseTo(0.1, 12);
    expect(largest).toBeCloseTo(2.25, 12);
    expect(smallest / largest).toBeGreaterThan(0.04);
  });
});

describe('5(b) gravitational potential energy, Ep = mgh', () => {
  it('computes known values with g = 10 N/kg', () => {
    expect(eq.gravitationalPotentialEnergy(2, 3)).toBe(60);
    expect(eq.gravitationalPotentialEnergy(50, 5.0)).toBe(2500); // notes: 50 kg raised 5.0 m
  });
  it('doubles when height or mass doubles', () => {
    expect(eq.gravitationalPotentialEnergy(1, 2)).toBe(2 * eq.gravitationalPotentialEnergy(1, 1));
    expect(eq.gravitationalPotentialEnergy(2, 1)).toBe(2 * eq.gravitationalPotentialEnergy(1, 1));
  });
  it('accepts another g (for example the Moon, 1.6 N/kg)', () => {
    expect(eq.gravitationalPotentialEnergy(5, 2, 1.6)).toBeCloseTo(16, 12);
  });
  it('rearranges for h and m (Lesson 4 asks for h)', () => {
    expect(eq.heightFromGravitationalPotentialEnergy(60, 2)).toBe(3);
    expect(eq.massFromGravitationalPotentialEnergy(60, 3)).toBe(2);
  });
});

describe('5(c) conservation of energy', () => {
  it('gives v = √(2gh) from mgh = ½mv²', () => {
    expect(eq.speedFromDrop(5)).toBeCloseTo(10, 12);
    expect(eq.speedFromDrop(0.8)).toBeCloseTo(4, 12);
  });
  it('shows the speed at the bottom does not depend on mass', () => {
    const h = 2.4;
    for (const m of [0.1, 1, 45, 80]) {
      const ep = eq.gravitationalPotentialEnergy(m, h);
      expect(eq.speedFromKineticEnergy(ep, m)).toBeCloseTo(eq.speedFromDrop(h), 10);
    }
  });
  it('heightFromSpeed is the inverse of speedFromDrop', () => {
    expect(eq.heightFromSpeed(eq.speedFromDrop(1.7))).toBeCloseTo(1.7, 12);
  });
  it('balances a ledger that swaps GPE for KE', () => {
    const m = 60, h = 3;
    const start = eq.gravitationalPotentialEnergy(m, h);
    for (const y of [3, 2.2, 1, 0]) {
      const gpe = eq.gravitationalPotentialEnergy(m, y);
      const v = eq.speedFromKineticEnergy(start - gpe, m);
      const ke = eq.kineticEnergy(m, v);
      expect(eq.ledgerBalances(start, { gpe, ke })).toBe(true);
    }
  });
  it('flags a ledger that is out by more than 0.1%', () => {
    expect(eq.ledgerBalances(1000, { a: 999.5 })).toBe(true);
    expect(eq.ledgerBalances(1000, { a: 998.9 })).toBe(false);
    expect(eq.ledgerBalances(1000, { a: 600, b: 401.2 })).toBe(false);
  });
  it('handles a zero starting total', () => {
    expect(eq.ledgerBalances(0, { a: 0 })).toBe(true);
    expect(eq.ledgerBalances(0, { a: 0.1 })).toBe(false);
  });
  it('rejects a negative store', () => {
    expect(() => eq.ledgerTotal({ ke: -1 })).toThrow(RangeError);
  });
});

describe('5(d) work done, W = F × d', () => {
  it('computes known values', () => {
    expect(eq.workDone(240, 5.0)).toBe(1200); // notes: 240 N up a 5.0 m slope
    expect(eq.workDone(200, 5)).toBe(1000);
  });
  it('is zero when the object does not move (pushing a wall)', () => {
    expect(eq.workDone(500, 0)).toBe(0);
  });
  it('rearranges for F and d', () => {
    expect(eq.forceFromWorkDone(1200, 5)).toBe(240);
    expect(eq.distanceFromWorkDone(1200, 240)).toBe(5);
  });
  it('equals the gain in GPE when lifting at constant speed (weight × height)', () => {
    expect(eq.workDone(eq.weight(50), 5)).toBe(eq.gravitationalPotentialEnergy(50, 5));
  });
});

describe('5(e) power, P = E/t', () => {
  it('matches the examples in the teacher\'s notes', () => {
    expect(eq.power(600, 30)).toBe(20); // motor: 600 J in 30 s
    expect(eq.energyFromPower(100, 5 * 60)).toBe(30000); // 100 W bulb for 5.0 min
    expect(eq.power(eq.workDone(700, 3.0), 2.5)).toBeCloseTo(840, 10); // 700 N up 3.0 m in 2.5 s
  });
  it('rearranges for t', () => {
    expect(eq.timeFromPower(30000, 100)).toBe(300);
  });
  it('compares two kettles heating the same water', () => {
    const energy = 336000;
    expect(eq.timeFromPower(energy, 1000)).toBe(2 * eq.timeFromPower(energy, 2000));
  });
  it('refuses a time of zero', () => {
    expect(() => eq.power(10, 0)).toThrow(RangeError);
  });
});

describe('3(e) weight = mass × g', () => {
  it('computes known values from the notes', () => {
    expect(eq.weight(1.5)).toBe(15);
    expect(eq.weight(0.092)).toBeCloseTo(0.92, 12);
  });
});

describe('input checks', () => {
  it('rejects negative, NaN and non-number inputs', () => {
    expect(() => eq.kineticEnergy(-1, 2)).toThrow(RangeError);
    expect(() => eq.kineticEnergy(NaN, 2)).toThrow(TypeError);
    expect(() => eq.kineticEnergy('2', 2)).toThrow(TypeError);
    expect(() => eq.gravitationalPotentialEnergy(1, Infinity)).toThrow(TypeError);
    expect(() => eq.speedFromKineticEnergy(10, 0)).toThrow(RangeError);
  });
});

describe('format.js', () => {
  it('rounds to significant figures', () => {
    expect(roundSig(3.14159, 3)).toBe(3.14);
    expect(roundSig(0.012549, 3)).toBe(0.0125);
    expect(roundSig(12345, 2)).toBe(12000);
    expect(roundSig(0, 3)).toBe(0);
  });
  it('formats the examples in CLAUDE.md', () => {
    expect(formatQuantity(12, 'J')).toBe('12 J');
    expect(formatQuantity(3.5, 'm/s')).toBe('3.5 m/s');
  });
  it('drops trailing zeros and never uses scientific notation', () => {
    expect(formatQuantity(2.25, 'J')).toBe('2.25 J');
    expect(formatQuantity(2.0, 'J')).toBe('2 J');
    expect(formatQuantity(0.0125, 'J')).toBe('0.0125 J');
    expect(formatQuantity(0.000001234, 'J')).toBe('0.00000123 J');
    expect(formatQuantity(123456789, 'J')).toBe('123 000 000 J');
  });
  it('groups thousands from 10 000 up, as in the teacher\'s notes', () => {
    expect(formatQuantity(1800, 'J')).toBe('1800 J');
    expect(formatQuantity(30000, 'J')).toBe('30 000 J');
    expect(formatQuantity(500000, 'W')).toBe('500 000 W');
  });
  it('rounds real results sensibly', () => {
    expect(formatQuantity(eq.speedFromDrop(3), 'm/s')).toBe('7.75 m/s');
    expect(formatQuantity(eq.speedFromDrop(3), 'm/s', 2)).toBe('7.7 m/s');
    expect(formatQuantity(eq.kineticEnergy(0.2, 1.5), 'J')).toBe('0.225 J');
  });
  it('handles negatives and rounding up across a power of ten', () => {
    expect(formatNumber(-3.456, 2)).toBe('-3.5');
    expect(formatNumber(9.996, 3)).toBe('10');
    expect(formatNumber(99999, 3)).toBe('100 000');
  });
  it('insists on a unit', () => {
    expect(() => formatQuantity(5, '')).toThrow(TypeError);
    expect(() => formatQuantity(5)).toThrow(TypeError);
  });
});
