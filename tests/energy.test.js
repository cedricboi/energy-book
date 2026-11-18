// tests/energy.test.js
// Phase 4: transfers conserve energy at every frame, jars fill in proportion
// to their energy, and the demo's ledger stays within 0.1% at every step.
import { describe, it, expect } from 'vitest';
import { TransferLedger } from '../src/energy/flow.js';
import { fillFraction } from '../src/energy/storeJar.js';
import { createSpringLaunch } from '../src/physics/models/springLaunch.js';
import { ledgerBalances } from '../src/physics/equations.js';

describe('TransferLedger', () => {
  it('keeps source + in transit + destination constant at every frame', () => {
    const tl = new TransferLedger(0.9);
    let source = 5;
    let dest = 1;
    const total = source + dest;
    for (let f = 0; f < 300; f++) {
      if (f < 120) {
        const out = Math.min(source, 0.04);
        source -= out;
        tl.emit(out);
      }
      dest += tl.step(1 / 60);
      expect(Math.abs(source + tl.inTransit + dest - total)).toBeLessThan(1e-9);
    }
    expect(tl.inTransit).toBeCloseTo(0, 12);
  });
});

describe('store jar fill', () => {
  it('is proportional to energy on one scale', () => {
    expect(fillFraction(0.01, 0.02)).toBeCloseTo(0.5, 12);
    expect(fillFraction(0.02, 0.02)).toBe(1);
    expect(fillFraction(0.004, 0.02) * 2).toBeCloseTo(fillFraction(0.008, 0.02), 12);
  });
  it('never overfills or goes below empty', () => {
    expect(fillFraction(0.05, 0.02)).toBe(1);
    expect(fillFraction(-1, 0.02)).toBe(0);
  });
});

describe('spring launch demo', () => {
  const model = createSpringLaunch();

  it('keeps the ledger within 0.1% at every step', () => {
    for (let t = 0; t <= model.duration + 0.5; t += 1 / 120) {
      const s = model.at(t);
      expect(ledgerBalances(model.total, { e: s.elastic, k: s.kinetic, i: s.internal })).toBe(true);
    }
  });
  it('ends with all the energy in the internal store', () => {
    const end = model.at(model.duration + 1);
    expect(end.kinetic).toBeCloseTo(0, 9);
    expect(end.internal).toBeCloseTo(model.total, 9);
  });
  it('stops after the distance given by work done = force × distance', () => {
    expect(model.stopDistance).toBeCloseTo(0.02 / 0.36, 12);
    expect(model.at(model.duration + 1).x).toBeCloseTo(model.compression + model.stopDistance, 9);
  });
  it('keeps the ball on the right-hand page (21 cm wide), drawn to scale', () => {
    // The ball starts 8.55 cm from the spine (block, spring, radius) and must
    // stop with its far side still on the page.
    const start = 0.03 + 0.022 + 0.0335;
    expect(start + model.compression + model.stopDistance + 0.0335).toBeLessThan(0.21);
  });
});

import { createDisplayLedger } from '../src/energy/displayLedger.js';

describe('display ledger for the spring demo (slowed down four times)', () => {
  it('balances at every frame and never shows a negative store', () => {
    const model = createSpringLaunch();
    const SLOW = 0.25;
    const travel = 0.35 * SLOW; // 0.35 s on screen
    const start = { elastic: model.total, kinetic: 0, internal: 0 };
    const dl = createDisplayLedger({
      start,
      travel,
      transfers: [
        { from: 'elastic', to: 'kinetic', moved: (p, c) => p.elastic - c.elastic },
        { from: 'kinetic', to: 'internal', moved: (p, c) => c.internal - p.internal },
      ],
    });
    let minShown = Infinity;
    const dt = (1 / 60) * SLOW;
    for (let t = dt; t < model.duration + 0.5; t += dt) {
      const s = model.at(t);
      const { display, transit } = dl.step({ elastic: s.elastic, kinetic: s.kinetic, internal: s.internal }, dt);
      const sum = display.elastic + display.kinetic + display.internal + transit;
      expect(ledgerBalances(model.total, { sum })).toBe(true);
      minShown = Math.min(minShown, display.elastic, display.kinetic, display.internal);
    }
    expect(minShown).toBeGreaterThan(-1e-9);
    const end = dl.snapshot();
    expect(end.transit).toBeCloseTo(0, 12);
    expect(end.display.internal).toBeCloseTo(model.total, 9);
  });
});
